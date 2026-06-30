#!/usr/bin/env python3
"""Create a draft task in the bangle-io Bangle 2 GitHub project."""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from typing import Any


ORG = "bangle-io"
PROJECT_NUMBER = 5
PROJECT_VIEW_URL = "https://github.com/orgs/bangle-io/projects/5/views/4"


PROJECT_QUERY = """
query($org: String!, $number: Int!) {
  organization(login: $org) {
    projectV2(number: $number) {
      id
      title
      url
      fields(first: 50) {
        nodes {
          ... on ProjectV2Field {
            id
            name
            dataType
          }
          ... on ProjectV2SingleSelectField {
            id
            name
            dataType
            options {
              id
              name
            }
          }
        }
      }
    }
  }
}
"""

ADD_DRAFT_MUTATION = """
mutation($projectId: ID!, $title: String!, $body: String!) {
  addProjectV2DraftIssue(input: {
    projectId: $projectId,
    title: $title,
    body: $body
  }) {
    projectItem {
      id
      content {
        ... on DraftIssue {
          id
          title
          body
        }
      }
    }
  }
}
"""

SET_SINGLE_SELECT_MUTATION = """
mutation(
  $projectId: ID!,
  $itemId: ID!,
  $fieldId: ID!,
  $optionId: String!
) {
  updateProjectV2ItemFieldValue(input: {
    projectId: $projectId,
    itemId: $itemId,
    fieldId: $fieldId,
    value: { singleSelectOptionId: $optionId }
  }) {
    projectV2Item {
      id
    }
  }
}
"""


class TaskError(RuntimeError):
    pass


def run_gh_graphql(query: str, fields: dict[str, str], int_fields: dict[str, int] | None = None) -> dict[str, Any]:
    command = ["gh", "api", "graphql", "-f", f"query={query}"]
    for key, value in fields.items():
        command.extend(["-f", f"{key}={value}"])
    for key, value in (int_fields or {}).items():
        command.extend(["-F", f"{key}={value}"])

    result = subprocess.run(command, text=True, capture_output=True, check=False)
    if result.returncode != 0:
        raise TaskError(result.stderr.strip() or result.stdout.strip() or "gh api graphql failed")
    try:
        payload = json.loads(result.stdout)
    except json.JSONDecodeError as error:
        raise TaskError(f"Could not parse gh output as JSON: {error}") from error
    if payload.get("errors"):
        raise TaskError(json.dumps(payload["errors"], indent=2))
    return payload["data"]


def project_metadata() -> dict[str, Any]:
    data = run_gh_graphql(
        PROJECT_QUERY,
        {"org": ORG},
        {"number": PROJECT_NUMBER},
    )
    project = data["organization"]["projectV2"]
    if not project:
        raise TaskError(f"Could not find {ORG} project {PROJECT_NUMBER}")
    return project


def find_single_select_option(project: dict[str, Any], field_name: str, option_name: str) -> tuple[str, str]:
    fields = project["fields"]["nodes"]
    for field in fields:
        if field.get("name", "").lower() != field_name.lower():
            continue
        if field.get("dataType") != "SINGLE_SELECT":
            raise TaskError(f"Project field {field_name!r} is not SINGLE_SELECT")
        for option in field.get("options", []):
            if option.get("name", "").lower() == option_name.lower():
                return field["id"], option["id"]
        valid = ", ".join(option["name"] for option in field.get("options", []))
        raise TaskError(f"Unknown {field_name} option {option_name!r}. Valid options: {valid}")
    raise TaskError(f"Could not find project field {field_name!r}")


def create_draft(project_id: str, title: str, body: str) -> dict[str, Any]:
    data = run_gh_graphql(
        ADD_DRAFT_MUTATION,
        {"projectId": project_id, "title": title, "body": body},
    )
    return data["addProjectV2DraftIssue"]["projectItem"]


def set_single_select(project_id: str, item_id: str, field_id: str, option_id: str) -> None:
    run_gh_graphql(
        SET_SINGLE_SELECT_MUTATION,
        {
            "projectId": project_id,
            "itemId": item_id,
            "fieldId": field_id,
            "optionId": option_id,
        },
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--title", required=True, help="Draft task title.")
    parser.add_argument("--body", default="", help="Markdown body for the draft task.")
    parser.add_argument(
        "--status",
        choices=["Backlog", "Ready", "In progress", "In review", "Done"],
        default="Backlog",
        help="Bangle 2 Status field.",
    )
    parser.add_argument("--priority", choices=["P0", "P1", "P2"], help="Optional Priority field.")
    parser.add_argument("--size", choices=["XS", "S", "M", "L", "XL"], help="Optional Size field.")
    parser.add_argument("--dry-run", action="store_true", help="Print the planned task without writing.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    planned = {
        "project": f"{ORG}/{PROJECT_NUMBER}",
        "viewUrl": PROJECT_VIEW_URL,
        "title": args.title,
        "body": args.body,
        "status": args.status,
        "priority": args.priority,
        "size": args.size,
    }
    if args.dry_run:
        print(json.dumps(planned, indent=2))
        return 0

    try:
        project = project_metadata()
        project_id = project["id"]
        item = create_draft(project_id, args.title, args.body)
        item_id = item["id"]

        for field_name, option_name in (
            ("Status", args.status),
            ("Priority", args.priority),
            ("Size", args.size),
        ):
            if option_name:
                field_id, option_id = find_single_select_option(project, field_name, option_name)
                set_single_select(project_id, item_id, field_id, option_id)

        print(json.dumps({**planned, "itemId": item_id, "projectUrl": project["url"]}, indent=2))
        return 0
    except FileNotFoundError:
        print("gh CLI is required but was not found on PATH.", file=sys.stderr)
        return 127
    except TaskError as error:
        print(str(error), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
