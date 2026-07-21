"""Pre-build question card + hard gate for deck creation.

When a user asks for a deck, the model calls present_deck_questions with 3-4
idea-specific questions. The server returns a ui:// EmbeddedResource — a
self-contained HTML card GiesChat renders via its existing MCP-UI path. The
card collects answers client-side and posts ONE MCP-UI `tool` action calling
submit_deck_answers. A valid submission (>=1 real answer) grants one unlock,
which create_presentation / create_presentation_from_template consume. The
answers come back through the server (not just chat text) precisely so the
gate can be enforced server-side.
"""
import html
import json
import os
import secrets
import time
from typing import Dict, List

from mcp.server.fastmcp import FastMCP
from mcp.types import EmbeddedResource, TextResourceContents

from gies_auth import current_user

QUESTIONS_TTL_SECONDS = int(os.environ.get("PPTX_QUESTIONS_TTL", str(30 * 60)))

_pending: Dict[str, Dict] = {}   # user -> {set_id, questions, ts}
_unlocked: Dict[str, int] = {}   # user -> permitted create calls


def _sweep() -> None:
    cutoff = time.monotonic() - QUESTIONS_TTL_SECONDS
    for user in [u for u, p in _pending.items() if p["ts"] <= cutoff]:
        _pending.pop(user, None)


def has_unlock(user: str) -> bool:
    return _unlocked.get(user, 0) > 0


def consume_unlock(user: str) -> None:
    remaining = _unlocked.get(user, 0) - 1
    if remaining > 0:
        _unlocked[user] = remaining
    else:
        _unlocked.pop(user, None)


GATE_ERROR = {
    "error": (
        "Deck questions have not been answered. Call present_deck_questions "
        "with 3-4 idea-specific questions first, then wait for the user to "
        "answer the card."
    )
}


def present(questions: List[Dict]) -> Dict:
    if not isinstance(questions, list) or not 1 <= len(questions) <= 5:
        return {"error": "Provide 1-5 questions."}
    for item in questions:
        options = item.get("options")
        if not item.get("question") or not isinstance(options, list) or not 2 <= len(options) <= 4:
            return {"error": "Each question needs a 'question' string and 2-4 'options'."}

    _sweep()
    user = current_user()
    set_id = secrets.token_urlsafe(8)
    _pending[user] = {"set_id": set_id, "questions": questions, "ts": time.monotonic()}
    return {"set_id": set_id}


def submit(set_id: str, answers: List[Dict]) -> Dict:
    _sweep()
    user = current_user()
    pending = _pending.get(user)
    if pending is None or pending["set_id"] != set_id:
        return {"error": "Unknown or expired question set. Re-present the questions with present_deck_questions."}

    answered = [a for a in answers if isinstance(a.get("answer"), str) and a["answer"].strip()]
    if not answered:
        return {
            "error": (
                "The user skipped every question. Re-present the card and ask "
                "them to answer at least one before building."
            )
        }

    _pending.pop(user, None)
    _unlocked[user] = 1
    summary = "; ".join(f"{a['question']}: {a['answer']}" for a in answered)
    return {
        "message": f"Answers recorded — build the deck now, shaped by them. {summary}",
        "answers": answered,
    }


def render_card(set_id: str, questions: List[Dict]) -> str:
    payload = {
        "setId": set_id,
        "questions": [
            {"q": html.escape(str(item["question"])), "opts": [html.escape(str(o)) for o in item["options"]]}
            for item in questions
        ],
    }
    data = json.dumps(payload).replace("</", "<\\/")
    return CARD_TEMPLATE.replace("__DATA__", data)


def register_question_tools(app: FastMCP) -> None:
    @app.tool()
    def present_deck_questions(questions: List[Dict]) -> list:
        """Show the user a question card before building a deck. Pass 1-5
        idea-specific questions, each {"question": str, "options": [2-4 strings]}.
        Wait for the card to trigger submit_deck_answers — never call that yourself."""
        result = present(questions)
        if "error" in result:
            return [{"type": "text", "text": result["error"]}]
        card = render_card(result["set_id"], questions)
        return [
            EmbeddedResource(
                type="resource",
                resource=TextResourceContents(
                    uri=f"ui://pptx/questions/{result['set_id']}",
                    mimeType="text/html",
                    text=card,
                ),
            ),
            {
                "type": "text",
                "text": (
                    "Question card presented. Stop and wait for the user's answers; "
                    "do not build or call submit_deck_answers yourself."
                ),
            },
        ]

    @app.tool()
    def submit_deck_answers(set_id: str, answers: List[Dict]) -> Dict:
        """Called by the question card when the user finishes. answers is a list of
        {"question": str, "answer": str} or {"question": str, "skipped": true}."""
        return submit(set_id, answers)


CARD_TEMPLATE = """<!doctype html><html><head><meta charset="utf-8"><style>
  body { margin: 0; background: transparent;
         font: 14.5px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; }
  .card { background: #2b2b2b; color: #ececec; border-radius: 18px;
          padding: 18px 20px 16px;
          box-shadow: 0 6px 24px rgba(0,0,0,.35); }
  .head { display: flex; align-items: center; gap: 12px; padding: 2px 6px 16px; }
  .title { font-family: "Iowan Old Style", Georgia, serif; font-size: 19px;
           font-weight: 400; margin: 0; flex: 1; }
  .pager { display: flex; align-items: center; gap: 8px; color: #9b9b9b;
           font-size: 15px; white-space: nowrap; }
  button { font: inherit; cursor: pointer; border: 0; background: none; color: inherit; padding: 0; }
  .nav, .close { color: #9b9b9b; font-size: 16px; width: 28px; height: 28px;
                 border-radius: 7px; display: grid; place-items: center; }
  .nav:disabled { opacity: .3; cursor: default; }
  .nav:not(:disabled):hover, .close:hover { color: #ececec; background: #3a3a3a; }
  .close { margin-left: 6px; }
  #opts { display: flex; flex-direction: column; }
  .opt { display: flex; align-items: center; gap: 16px; width: 100%; text-align: left;
         color: #ececec; font-size: 16.5px; padding: 12px 16px 12px 12px;
         border-radius: 12px; min-height: 58px; }
  .opt + .opt, .free { border-top: 1px solid #383838; }
  .opt:hover { background: #3a3a3a; }
  .chip { width: 36px; height: 36px; border-radius: 10px; flex: none; display: grid;
          place-items: center; background: #3d3d3d; color: #9b9b9b;
          font-size: 15px; font-weight: 500; }
  .opt:hover .chip { color: #ececec; background: #424242; }
  .arrow { margin-left: auto; color: #E84A27; opacity: 0; font-size: 17px; }
  .opt:hover .arrow { opacity: 1; }
  .free { display: flex; align-items: center; gap: 16px; padding: 10px 16px 6px 12px;
          border-radius: 12px; min-height: 58px; }
  .free:focus-within { background: #3a3a3a; }
  .free .chip { font-size: 14px; }
  .free input { flex: 1; background: none; border: 0; outline: none; color: #ececec;
                font: inherit; font-size: 16.5px; }
  .free input::placeholder { color: #9b9b9b; }
  .skip { background: #3a3a3a; color: #ececec; font-size: 15px;
          padding: 10px 18px; border-radius: 11px; }
  .skip:hover { background: #424242; }
  .done { font-size: 15px; color: #9b9b9b; padding: 8px 6px; }
  .done b { color: #ececec; font-weight: 600; }
  button:focus-visible, input:focus-visible { outline: 2px solid #E84A27; outline-offset: 2px; }
</style></head><body>
<div class="card" id="card">
  <div class="head">
    <h2 class="title" id="title"></h2>
    <div class="pager">
      <button class="nav" id="prev" aria-label="Previous">&#8249;</button>
      <span id="pos"></span>
      <button class="nav" id="next" aria-label="Next">&#8250;</button>
    </div>
    <button class="close" id="close" aria-label="Dismiss">&#10005;</button>
  </div>
  <div id="opts"></div>
  <div class="free">
    <span class="chip">&#9998;</span>
    <input id="free" placeholder="Something else" aria-label="Custom answer">
    <button class="skip" id="skip">Skip</button>
  </div>
</div>
<script>
  var DATA = __DATA__;
  var answers = new Array(DATA.questions.length).fill(undefined);
  var idx = 0;
  var $ = function (id) { return document.getElementById(id); };

  function render() {
    var item = DATA.questions[idx];
    $("title").innerHTML = item.q;
    $("pos").textContent = (idx + 1) + " of " + DATA.questions.length;
    $("prev").disabled = idx === 0;
    $("next").disabled = idx === DATA.questions.length - 1;
    var box = $("opts");
    box.innerHTML = "";
    item.opts.forEach(function (label, i) {
      var b = document.createElement("button");
      b.className = "opt";
      b.innerHTML = '<span class="chip">' + (i + 1) + '</span><span>' + label +
                    '</span><span class="arrow">&#8594;</span>';
      b.onclick = function () { answer(label); };
      box.appendChild(b);
    });
    $("free").value = "";
  }

  function answer(value) {
    answers[idx] = value;
    if (idx < DATA.questions.length - 1) { idx++; render(); } else { finish(); }
  }

  function finish() {
    var body = DATA.questions.map(function (item, i) {
      return answers[i] == null
        ? { question: item.q, skipped: true }
        : { question: item.q, answer: answers[i] };
    });
    window.parent.postMessage({
      type: "tool",
      payload: { toolName: "submit_deck_answers",
                 params: { set_id: DATA.setId, answers: body } }
    }, "*");
    var real = body.filter(function (a) { return !a.skipped; }).length;
    $("card").innerHTML = real
      ? '<div class="done"><b>Answers captured</b> — building your deck.</div>'
      : '<div class="done"><b>Everything was skipped</b> — at least one answer is needed before building.</div>';
  }

  $("skip").onclick = function () { answer(null); };
  $("prev").onclick = function () { if (idx > 0) { idx--; render(); } };
  $("next").onclick = function () { if (idx < DATA.questions.length - 1) { idx++; render(); } };
  $("close").onclick = function () {
    $("card").innerHTML = '<div class="done">Questions dismissed — answer them to start the build.</div>';
  };
  $("free").addEventListener("keydown", function (e) {
    if (e.key === "Enter" && e.target.value.trim()) answer(e.target.value.trim());
  });
  render();
</script>
</body></html>"""
