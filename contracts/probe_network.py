# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
import hashlib
import json

class NetworkProbe(gl.Contract):
    """
    Minimal probe contract to verify StudioNet validator reachability and
    deterministic bounded extraction for immutable evidence sources
    (Archive.org id_ snapshots, Wikipedia oldid revisions, raw GitHub commit SHAs)
    prior to full DareYou adjudication.
    """
    last_probe_result: str

    def __init__(self):
        self.last_probe_result = "{}"

    @gl.public.view
    def get_last_probe(self) -> str:
        return self.last_probe_result

    @gl.public.write
    def probe_url(self, target_url: str, expected_keyword: str) -> str:
        clean_url = str(target_url).strip()
        clean_kw = str(expected_keyword).strip()

        def fetch_and_extract() -> str:
            fetched_text = ""
            try:
                raw_page = gl.nondet.web.render(clean_url, mode="text")
                fetched_text = " ".join(str(raw_page).split())
            except Exception as e:
                fetched_text = f"FETCH_ERROR: {str(e)}"

            bounded = fetched_text[:2000]
            digest = hashlib.sha256(bounded.encode("utf-8")).hexdigest()[:16]
            kw_found = clean_kw.lower() in fetched_text.lower() if clean_kw else True

            return (
                f"URL: {clean_url}\n"
                f"BOUNDED_LENGTH: {len(bounded)}\n"
                f"SHA256_PREFIX: {digest}\n"
                f"KEYWORD_FOUND: {kw_found}\n"
                f"EXCERPT: {bounded[:600]}"
            )

        raw = gl.eq_principle.prompt_non_comparative(
            fetch_and_extract,
            task=(
                "Verify whether the fetched immutable page loaded and whether KEYWORD_FOUND is True. "
                "Return a JSON object with keys: 'status' ('REACHABLE' or 'UNREACHABLE') and 'keyword_verified' (boolean)."
            ),
            criteria="""
                1. Output must be valid JSON with keys 'status' and 'keyword_verified'.
                2. No numeric scores or arbitrary text outside JSON.
            """
        )

        clean_str = str(raw).strip()
        self.last_probe_result = clean_str
        return clean_str
