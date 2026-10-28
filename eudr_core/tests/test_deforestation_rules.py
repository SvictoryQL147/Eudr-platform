from dataclasses import replace

from app.config import Settings
from app.services.deforestation import DemoProvider, PlotToScreen, normalize_risk, parse_whisp_feature
from app.services.rules.deforestation_rules import deforestation_risk
from tests.fixtures import clean_context

s = Settings()


def _with_risk(risk):
    ctx = clean_context()
    farm = ctx.farms["farm-1"]
    ctx.farms["farm-1"] = replace(farm, deforestation_risk=risk)
    return ctx


def test_low_risk_passes():
    assert deforestation_risk(_with_risk("low"), s) == []


def test_high_risk_is_critical():
    [f] = deforestation_risk(_with_risk("high"), s)
    assert f.severity == "critical" and f.rule_id == "farm.deforestation_risk"


def test_more_info_needed_is_high():
    [f] = deforestation_risk(_with_risk("more_info_needed"), s)
    assert f.severity == "high"


def test_not_screened_is_medium():
    [f] = deforestation_risk(_with_risk(None), s)
    assert f.severity == "medium"


def test_unmapped_farm_is_left_to_missing_geolocation_rule():
    ctx = clean_context()
    ctx.farms["farm-1"] = replace(ctx.farms["farm-1"], has_geolocation=False, deforestation_risk=None)
    assert deforestation_risk(ctx, s) == []


def test_parse_whisp_feature_reads_risk_and_indicators_case_insensitively():
    props = {
        "external_id": "farm-9",
        "Ind_01_treecover": "yes",
        "Ind_02_commodities": "no",
        "Ind_03_disturbance_before_2020": "no",
        "Ind_04_disturbance_after_2020": "yes",
        "Risk_PCrop": "high",
        "Area": 1.23,
        "Country": "NGA",
    }
    farm_id, risk, ind, details = parse_whisp_feature(props, "risk_pcrop")
    assert farm_id == "farm-9" and risk == "high"
    assert ind == {
        "treecover_2020": "yes",
        "commodities_2020": "no",
        "disturbance_before_2020": "no",
        "disturbance_after_2020": "yes",
    }
    assert details["area"] == 1.23


def test_normalize_risk_variants():
    assert normalize_risk("More info needed") == "more_info_needed"
    assert normalize_risk("LOW") == "low"
    assert normalize_risk("unknown") is None


def test_demo_provider_is_deterministic():
    plot = PlotToScreen("f1", [[0, 0], [1, 0], [1, 1], [0, 0]], "ab" * 32)
    a = DemoProvider().screen([plot], "cocoa")
    b = DemoProvider().screen([plot], "cocoa")
    assert a == b and a[0].risk in {"low", "high", "more_info_needed"}
