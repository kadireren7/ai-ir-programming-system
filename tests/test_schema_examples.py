import json
from pathlib import Path

import jsonschema
import pytest

REPO = Path(__file__).resolve().parents[1]
SCHEMA_PATH = REPO / "spec" / "IR_BUNDLE.schema.json"
EXAMPLES = REPO / "examples" / "core"


@pytest.fixture(scope="module")
def schema():
    with open(SCHEMA_PATH, encoding="utf-8") as f:
        return json.load(f)


@pytest.mark.parametrize(
    "filename",
    [
        "valid_minimal_flow.json",
        "valid_login_flow.json",
        "valid_start_session_flow.json",
        "valid_bundle_with_library_refs.json",
        "consumes_torqa_demo_lib.json",
        "valid_strings_equal_flow.json",
        "valid_session_postcondition_flow.json",
        "demo_multi_surface_flow.json",
        "invalid_empty_goal.json",
        "invalid_duplicate_condition_id.json",
    ],
)
def test_example_validates_against_json_schema(schema, filename):
    with open(EXAMPLES / filename, encoding="utf-8") as f:
        data = json.load(f)
    jsonschema.validate(instance=data, schema=schema)
