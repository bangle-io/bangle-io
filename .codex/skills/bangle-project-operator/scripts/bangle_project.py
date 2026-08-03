#!/usr/bin/env python3
"""Inspect and mutate the Bangle 2 GitHub Project using live field metadata."""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
import unicodedata
from datetime import date, timedelta
from pathlib import Path
from typing import Any


ORG = "bangle-io"
PROJECT_NUMBER = 5
PROJECT_VIEW_URL = "https://github.com/orgs/bangle-io/projects/5/views/8"

PROJECT_QUERY = """
query($org: String!, $number: Int!) {
  organization(login: $org) {
    projectV2(number: $number) {
      id
      title
      url
      shortDescription
      readme
      views(first: 30) { nodes { id name number layout filter } }
      fields(first: 50) {
        nodes {
          __typename
          ... on ProjectV2FieldCommon { id name dataType }
          ... on ProjectV2SingleSelectField { options { id name } }
          ... on ProjectV2IterationField {
            configuration {
              iterations { id title startDate duration }
              completedIterations { id title startDate duration }
            }
          }
        }
      }
    }
  }
}
"""

ALIASES = {
    "status": {
        "new": "new",
        "untriaged": "new",
        "backlog": "backlog",
        "ready": "backlog",
        "inprogress": "inprogress",
        "doing": "inprogress",
        "active": "inprogress",
        "done": "done",
        "complete": "done",
        "completed": "done",
        "icebox": "icebox",
        "deferred": "icebox",
    },
    "priority": {
        "p0": "urgent",
        "urgent": "urgent",
        "p1": "high",
        "high": "high",
        "p2": "medium",
        "medium": "medium",
        "normal": "medium",
        "p3": "low",
        "low": "low",
    },
    "size": {
        "xs": "tiny",
        "tiny": "tiny",
        "s": "small",
        "small": "small",
        "m": "medium",
        "medium": "medium",
        "l": "large",
        "large": "large",
        "xl": "xlarge",
        "xlarge": "xlarge",
    },
    "productarea": {
        "editor": "editor",
        "workspace": "workspacesstorage",
        "workspaces": "workspacesstorage",
        "storage": "workspacesstorage",
        "workspacesstorage": "workspacesstorage",
        "navigation": "navigationorganization",
        "organization": "navigationorganization",
        "navigationorganization": "navigationorganization",
        "onboarding": "onboardingdelight",
        "delight": "onboardingdelight",
        "onboardingdelight": "onboardingdelight",
        "platform": "platformquality",
        "quality": "platformquality",
        "platformquality": "platformquality",
    },
}


class ProjectError(RuntimeError):
    pass


def run_json(command: list[str]) -> dict[str, Any]:
    try:
        result = subprocess.run(command, text=True, capture_output=True, check=False)
    except FileNotFoundError as error:
        raise ProjectError(f"Required command not found: {command[0]}") from error
    if result.returncode != 0:
        detail = result.stderr.strip() or result.stdout.strip()
        raise ProjectError(f"Command failed ({' '.join(command)}): {detail}")
    try:
        payload = json.loads(result.stdout)
    except json.JSONDecodeError as error:
        raise ProjectError(f"Could not parse JSON from {' '.join(command)}: {error}") from error
    if not isinstance(payload, dict):
        raise ProjectError(f"Expected a JSON object from {' '.join(command)}")
    return payload


def project_metadata() -> dict[str, Any]:
    payload = run_json(
        [
            "gh",
            "api",
            "graphql",
            "-f",
            f"query={PROJECT_QUERY}",
            "-f",
            f"org={ORG}",
            "-F",
            f"number={PROJECT_NUMBER}",
        ]
    )
    errors = payload.get("errors")
    if errors:
        raise ProjectError(json.dumps(errors, indent=2))
    project = payload.get("data", {}).get("organization", {}).get("projectV2")
    if not project:
        raise ProjectError(f"Could not find {ORG} project {PROJECT_NUMBER}")
    return project


def project_items(query: str | None = None) -> dict[str, Any]:
    command = [
        "gh",
        "project",
        "item-list",
        str(PROJECT_NUMBER),
        "--owner",
        ORG,
        "--limit",
        "500",
        "--format",
        "json",
    ]
    if query:
        command.extend(["--query", query])
    return run_json(command)


def canonical(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value).casefold()
    return "".join(character for character in normalized if character.isalnum())


def find_field(project: dict[str, Any], requested_name: str) -> dict[str, Any]:
    requested = canonical(requested_name)
    matches = [
        field
        for field in project["fields"]["nodes"]
        if canonical(field.get("name", "")) == requested
    ]
    if len(matches) != 1:
        available = ", ".join(field.get("name", "") for field in project["fields"]["nodes"])
        raise ProjectError(f"Could not uniquely resolve field {requested_name!r}. Available: {available}")
    return matches[0]


def resolve_option(field: dict[str, Any], requested_value: str) -> dict[str, str]:
    field_key = canonical(field["name"])
    requested = canonical(requested_value)
    target = ALIASES.get(field_key, {}).get(requested, requested)
    matches = [option for option in field.get("options", []) if canonical(option["name"]) == target]
    if len(matches) != 1:
        available = ", ".join(option["name"] for option in field.get("options", []))
        raise ProjectError(
            f"Could not resolve {requested_value!r} for field {field['name']!r}. Available: {available}"
        )
    return matches[0]


def all_iterations(field: dict[str, Any]) -> list[dict[str, Any]]:
    configuration = field.get("configuration") or {}
    return [
        *configuration.get("completedIterations", []),
        *configuration.get("iterations", []),
    ]


def resolve_iteration(field: dict[str, Any], requested_value: str) -> dict[str, Any]:
    iterations = all_iterations(field)
    requested = canonical(requested_value)
    today = date.today()

    if requested in {"current", "currentsprint", "thissprint"}:
        matches = []
        for iteration in iterations:
            start = date.fromisoformat(iteration["startDate"])
            if start <= today < start + timedelta(days=iteration["duration"]):
                matches.append(iteration)
    elif requested in {"next", "nextsprint"}:
        future = sorted(
            (item for item in iterations if date.fromisoformat(item["startDate"]) > today),
            key=lambda item: item["startDate"],
        )
        matches = future[:1]
    else:
        matches = [
            iteration
            for iteration in iterations
            if requested in {canonical(iteration["id"]), canonical(iteration["title"])}
        ]

    if len(matches) != 1:
        available = ", ".join(iteration["title"] for iteration in iterations)
        raise ProjectError(
            f"Could not uniquely resolve iteration {requested_value!r}. Available: {available}"
        )
    return matches[0]


def read_body(args: argparse.Namespace, required: bool = False) -> str | None:
    body = getattr(args, "body", None)
    body_file = getattr(args, "body_file", None)
    if body is not None and body_file is not None:
        raise ProjectError("Use either --body or --body-file, not both")
    if body_file is not None:
        try:
            body = Path(body_file).read_text(encoding="utf-8")
        except OSError as error:
            raise ProjectError(f"Could not read body file {body_file!r}: {error}") from error
    if required and body is None:
        raise ProjectError("Create requires --body or --body-file")
    return body


def resolve_field_changes(project: dict[str, Any], args: argparse.Namespace) -> list[dict[str, Any]]:
    changes = []
    for argument, field_name in (
        ("status", "Status"),
        ("priority", "Priority"),
        ("size", "Size"),
        ("product_area", "Product area"),
    ):
        value = getattr(args, argument, None)
        if value is None:
            continue
        field = find_field(project, field_name)
        option = resolve_option(field, value)
        changes.append(
            {
                "field": field["name"],
                "fieldId": field["id"],
                "value": option["name"],
                "optionId": option["id"],
                "kind": "single-select",
            }
        )

    iteration_value = getattr(args, "iteration", None)
    if iteration_value is not None:
        field = find_field(project, "w")
        iteration = resolve_iteration(field, iteration_value)
        changes.append(
            {
                "field": field["name"],
                "fieldId": field["id"],
                "value": iteration["title"],
                "iterationId": iteration["id"],
                "kind": "iteration",
            }
        )
    return changes


def set_field(project_id: str, item_id: str, change: dict[str, Any]) -> None:
    command = [
        "gh",
        "project",
        "item-edit",
        "--id",
        item_id,
        "--project-id",
        project_id,
        "--field-id",
        change["fieldId"],
    ]
    if change["kind"] == "single-select":
        command.extend(["--single-select-option-id", change["optionId"]])
    else:
        command.extend(["--iteration-id", change["iterationId"]])
    run_json([*command, "--format", "json"])


def clear_field(project: dict[str, Any], item_id: str, field_name: str) -> str:
    field = resolve_clear_field(project, field_name)
    run_json(
        [
            "gh",
            "project",
            "item-edit",
            "--id",
            item_id,
            "--project-id",
            project["id"],
            "--field-id",
            field["id"],
            "--clear",
            "--format",
            "json",
        ]
    )
    return field["name"]


def resolve_clear_field(project: dict[str, Any], field_name: str) -> dict[str, Any]:
    field = find_field(project, field_name)
    if field.get("dataType") not in {"SINGLE_SELECT", "ITERATION"}:
        raise ProjectError(f"Refusing to clear unsupported field {field['name']!r}")
    return field


def find_item(item_id: str) -> dict[str, Any]:
    matches = [item for item in project_items().get("items", []) if item.get("id") == item_id]
    if len(matches) != 1:
        raise ProjectError(f"Could not find unique project item {item_id!r}")
    return matches[0]


def inspect_command(args: argparse.Namespace) -> dict[str, Any]:
    project = project_metadata()
    items_payload = project_items(args.query)
    if not args.include_body:
        for item in items_payload.get("items", []):
            content = item.get("content")
            if isinstance(content, dict):
                content.pop("body", None)
    return {
        "project": project,
        "items": items_payload.get("items", []),
        "totalCount": items_payload.get("totalCount"),
        "viewUrl": PROJECT_VIEW_URL,
    }


def create_command(args: argparse.Namespace) -> dict[str, Any]:
    project = project_metadata()
    body = read_body(args, required=True)
    changes = resolve_field_changes(project, args)
    planned = {
        "action": "create",
        "project": f"{ORG}/{PROJECT_NUMBER}",
        "title": args.title,
        "body": body,
        "fields": [{"field": change["field"], "value": change["value"]} for change in changes],
        "viewUrl": PROJECT_VIEW_URL,
    }
    if args.dry_run:
        return {"dryRun": True, **planned}

    item = run_json(
        [
            "gh",
            "project",
            "item-create",
            str(PROJECT_NUMBER),
            "--owner",
            ORG,
            "--title",
            args.title,
            "--body",
            body or "",
            "--format",
            "json",
        ]
    )
    item_id = item.get("id")
    if not item_id:
        raise ProjectError(f"Created item response did not include an ID: {json.dumps(item)}")
    applied = []
    try:
        for change in changes:
            set_field(project["id"], item_id, change)
            applied.append({"field": change["field"], "value": change["value"]})
    except ProjectError as error:
        raise ProjectError(
            f"Created item {item_id}, but field updates only reached {json.dumps(applied)}. {error}"
        ) from error
    return {**planned, "itemId": item_id, "appliedFields": applied}


def update_command(args: argparse.Namespace) -> dict[str, Any]:
    project = project_metadata()
    item = find_item(args.item_id)
    body = read_body(args)
    content = item.get("content") or {}
    if (args.title is not None or body is not None) and content.get("type") != "DraftIssue":
        raise ProjectError(
            "--title and --body/--body-file are supported only for draft items; "
            "edit repository issue or PR content through its explicit GitHub workflow"
        )
    changes = resolve_field_changes(project, args)
    clears = [resolve_clear_field(project, name)["name"] for name in args.clear_field]
    planned = {
        "action": "update",
        "itemId": args.item_id,
        "currentTitle": item.get("title"),
        "title": args.title,
        "body": body,
        "fields": [{"field": change["field"], "value": change["value"]} for change in changes],
        "clearFields": clears,
        "viewUrl": PROJECT_VIEW_URL,
    }
    if not any([args.title is not None, body is not None, changes, clears]):
        raise ProjectError("Update requires a title, body, field value, or --clear-field")
    if args.dry_run:
        return {"dryRun": True, **planned}

    applied: list[dict[str, Any]] = []
    if args.title is not None or body is not None:
        command = ["gh", "project", "item-edit", "--id", args.item_id]
        if args.title is not None:
            command.extend(["--title", args.title])
        if body is not None:
            command.extend(["--body", body])
        run_json([*command, "--format", "json"])
        applied.append({"content": "draft", "title": args.title, "bodyUpdated": body is not None})
    try:
        for change in changes:
            set_field(project["id"], args.item_id, change)
            applied.append({"field": change["field"], "value": change["value"]})
        for field_name in args.clear_field:
            cleared = clear_field(project, args.item_id, field_name)
            applied.append({"field": cleared, "cleared": True})
    except ProjectError as error:
        raise ProjectError(
            f"Updated item {args.item_id}, but mutations only reached {json.dumps(applied)}. {error}"
        ) from error
    return {**planned, "applied": applied, "item": find_item(args.item_id)}


def add_field_arguments(parser: argparse.ArgumentParser, required: bool) -> None:
    parser.add_argument("--status", required=required)
    parser.add_argument("--priority", required=required)
    parser.add_argument("--size", required=required)
    parser.add_argument("--product-area", required=required)
    parser.add_argument("--iteration", help="Iteration title/id, 'current', or 'next'.")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="command", required=True)

    inspect_parser = subparsers.add_parser("inspect", help="Read live project metadata and items.")
    inspect_parser.add_argument("--query", help="GitHub Projects filter query.")
    inspect_parser.add_argument("--include-body", action="store_true")

    create_parser = subparsers.add_parser("create", help="Create and classify a draft item.")
    create_parser.add_argument("--title", required=True)
    create_parser.add_argument("--body")
    create_parser.add_argument("--body-file")
    create_parser.add_argument("--dry-run", action="store_true")
    add_field_arguments(create_parser, required=True)

    update_parser = subparsers.add_parser("update", help="Update one exact project item.")
    update_parser.add_argument("--item-id", required=True)
    update_parser.add_argument("--title")
    update_parser.add_argument("--body")
    update_parser.add_argument("--body-file")
    update_parser.add_argument("--clear-field", action="append", default=[])
    update_parser.add_argument("--dry-run", action="store_true")
    add_field_arguments(update_parser, required=False)

    return parser.parse_args()


def main() -> int:
    try:
        args = parse_args()
        if args.command == "inspect":
            result = inspect_command(args)
        elif args.command == "create":
            result = create_command(args)
        else:
            result = update_command(args)
        print(json.dumps(result, indent=2, ensure_ascii=False))
        return 0
    except ProjectError as error:
        print(str(error), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
