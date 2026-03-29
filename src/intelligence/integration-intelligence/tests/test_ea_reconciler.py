"""Tests for the EA reconciliation service."""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from services.ea_reconciler import EAReconciler, levenshtein_distance


def test_levenshtein_identical():
    assert levenshtein_distance("hello", "hello") == 0


def test_levenshtein_one_edit():
    assert levenshtein_distance("hello", "hallo") == 1


def test_levenshtein_two_edits():
    assert levenshtein_distance("kitten", "sitting") == 3


def test_exact_match():
    """Exact CI match should yield confidence 1.0."""
    reconciler = EAReconciler()
    integration = {
        "source_app": "App A",
        "target_app": "App B",
        "source_ci": "ci_001",
        "target_ci": "ci_002",
    }
    ea_rels = [
        {"parent": "ci_001", "child": "ci_002", "parent_name": "App A", "child_name": "App B", "sys_id": "ea_001"},
    ]

    matches = reconciler.match(integration, ea_rels)
    assert len(matches) == 1
    assert matches[0]["confidence"] == 1.0
    assert matches[0]["mapping_status"] == "Suggested"


def test_fuzzy_name_match():
    """Fuzzy name match within edit distance 2 → confidence 0.7-0.9."""
    reconciler = EAReconciler()
    integration = {
        "source_app": "Orders",
        "target_app": "Payments",
    }
    ea_rels = [
        {"parent": "", "child": "", "parent_name": "Orderz", "child_name": "Paymants", "sys_id": "ea_002"},
    ]

    matches = reconciler.match(integration, ea_rels)
    assert len(matches) >= 1
    assert matches[0]["confidence"] >= 0.7


def test_no_match():
    """Completely different names and no CI match → no suggestions."""
    reconciler = EAReconciler()
    integration = {
        "source_app": "App X",
        "target_app": "App Y",
    }
    ea_rels = [
        {"parent": "", "child": "", "parent_name": "Totally Different", "child_name": "Unrelated System", "sys_id": "ea_003"},
    ]

    matches = reconciler.match(integration, ea_rels)
    assert len(matches) == 0


def test_reverse_direction_match():
    """Reversed CI match → high confidence but slightly less than exact."""
    reconciler = EAReconciler()
    integration = {
        "source_ci": "ci_001",
        "target_ci": "ci_002",
        "source_app": "A",
        "target_app": "B",
    }
    ea_rels = [
        {"parent": "ci_002", "child": "ci_001", "parent_name": "B", "child_name": "A", "sys_id": "ea_004"},
    ]

    matches = reconciler.match(integration, ea_rels)
    assert len(matches) >= 1
    assert matches[0]["confidence"] >= 0.9


def test_group_match():
    """Business service match → confidence 0.5."""
    reconciler = EAReconciler()
    integration = {
        "source_app": "Service A",
        "target_app": "Service B",
        "source_business_service": "E-Commerce",
    }
    ea_rels = [
        {"parent": "", "child": "", "parent_name": "X", "child_name": "Y", "sys_id": "ea_005", "business_service": "E-Commerce"},
    ]

    matches = reconciler.match(integration, ea_rels)
    assert len(matches) >= 1
    assert matches[0]["confidence"] == 0.5


def test_batch_reconcile():
    """Batch reconciliation returns results for all integrations."""
    reconciler = EAReconciler()
    integrations = [
        {"source_app": "App Alpha", "target_app": "App Beta", "source_ci": "ci_a", "target_ci": "ci_b"},
        {"source_app": "Completely Different", "target_app": "Unrelated System"},
    ]
    ea_rels = [
        {"parent": "ci_a", "child": "ci_b", "parent_name": "App Alpha", "child_name": "App Beta", "sys_id": "ea_001"},
    ]

    results = reconciler.reconcile_batch(integrations, ea_rels)
    assert len(results) == 2
    assert len(results["App Alpha \u2192 App Beta"]) >= 1  # Should match
    assert len(results["Completely Different \u2192 Unrelated System"]) == 0  # No match


def test_multiple_matches_sorted():
    """Multiple matches should be sorted by confidence."""
    reconciler = EAReconciler()
    integration = {
        "source_app": "Orders",
        "target_app": "Payments",
        "source_ci": "ci_order",
        "target_ci": "ci_payment",
    }
    ea_rels = [
        {"parent": "", "child": "", "parent_name": "Orderz", "child_name": "Paymants", "sys_id": "ea_fuzzy"},
        {"parent": "ci_order", "child": "ci_payment", "parent_name": "Orders", "child_name": "Payments", "sys_id": "ea_exact"},
    ]

    matches = reconciler.match(integration, ea_rels)
    assert len(matches) >= 2
    # Exact match should be first (highest confidence)
    assert matches[0]["confidence"] >= matches[1]["confidence"]
    assert matches[0]["ea_relationship"] == "ea_exact"
