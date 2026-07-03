async function storeSources({ methods, courseValue, scraped }) {
  for (const page of scraped) {
    await methods.upsertTutorSource({
      courseValue,
      url: page.url,
      title: page.title,
      text: page.text,
      summary: page.summary,
    });
  }
  await methods.pruneTutorSources({ courseValue, keepUrls: scraped.map((p) => p.url) });
  return scraped.length;
}

module.exports = { storeSources };
