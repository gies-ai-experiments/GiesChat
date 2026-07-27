"""The deployed hostname must survive the SDK's DNS-rebinding allowlist.

Regression guard for the 421 "Invalid Host header" outage: the MCP SDK allows
only localhost by default, so every request to https://pptx-mcp.azurewebsites.net
was rejected before the MCP handshake began, while local dev kept working.
"""

from mcp.server.transport_security import TransportSecuritySettings

from gies_server import allow_public_host


def _defaults():
    return TransportSecuritySettings(
        enable_dns_rebinding_protection=True,
        allowed_hosts=["127.0.0.1:*", "localhost:*", "[::1]:*"],
        allowed_origins=["http://127.0.0.1:*", "http://localhost:*", "http://[::1]:*"],
    )


def test_public_host_is_allowed():
    settings = _defaults()
    allow_public_host(settings, "https://pptx-mcp.azurewebsites.net")
    assert "pptx-mcp.azurewebsites.net" in settings.allowed_hosts
    assert "https://pptx-mcp.azurewebsites.net" in settings.allowed_origins


def test_localhost_defaults_are_kept():
    settings = _defaults()
    allow_public_host(settings, "https://pptx-mcp.azurewebsites.net")
    assert "localhost:*" in settings.allowed_hosts
    assert settings.enable_dns_rebinding_protection is True


def test_unset_public_url_changes_nothing():
    settings = _defaults()
    allow_public_host(settings, "")
    assert settings.allowed_hosts == _defaults().allowed_hosts


def test_repeated_calls_do_not_duplicate():
    settings = _defaults()
    allow_public_host(settings, "https://pptx-mcp.azurewebsites.net")
    allow_public_host(settings, "https://pptx-mcp.azurewebsites.net")
    assert settings.allowed_hosts.count("pptx-mcp.azurewebsites.net") == 1
