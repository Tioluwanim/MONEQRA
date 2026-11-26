from tests.test_api_routes import api  # noqa: F401

H = {r: {"Authorization": f"Bearer demo-{r}-key"} for r in ("viewer", "operator", "approver", "admin")}


def seed(api):
    r = api.post("/v1/simulator/seed", headers=H["operator"], json={"branch": "independent", "reset": True})
    assert r.status_code == 200
    # seeding must not change the headline numbers
    assert r.json()["obligation_kobo"] == 110000000


def coverage(api, bps=6000):
    r = api.get(f"/v1/coverage?recovery_probability_bps={bps}", headers=H["viewer"])
    assert r.status_code == 200
    return r.json()


def test_coverage_demo_numbers(api):
    seed(api)
    c = coverage(api, 6000)
    assert c["confirmed_funds_kobo"] == 99000000
    assert c["assumed_unconfirmed_kobo"] == 21600000
    by = {i["label"]: i for i in c["items"]}
    assert by["Ade Stores supplier obligation"]["status"] == "depends_on_unconfirmed"
    assert by["Staff payroll"]["status"] == "at_risk"
    assert c["covered_kobo"] + c["depends_on_unconfirmed_kobo"] + c["at_risk_kobo"] == c["total_due_kobo"]
    assert coverage(api, 0)["items"][0]["status"] == "at_risk"


def test_register_obligation_role_and_validation(api):
    seed(api)
    body = {"label": "Generator fuel", "amount_kobo": 5000000, "due_at": "2026-11-27T12:00:00+01:00", "category": "supplier"}
    assert api.post("/v1/obligations", headers=H["viewer"], json=body).status_code == 403
    ok = api.post("/v1/obligations", headers=H["operator"], json=body)
    assert ok.status_code == 201 and ok.json()["category"] == "supplier"
    assert api.post("/v1/obligations", headers=H["operator"], json={**body, "due_at": "2026-11-27T12:00:00"}).status_code == 422
    assert api.post("/v1/obligations", headers=H["operator"], json={**body, "amount_kobo": 0}).status_code == 422
    assert api.post("/v1/obligations", headers=H["operator"], json={**body, "category": "crypto"}).status_code == 422
    configured = api.post(
        "/v1/obligations",
        headers=H["operator"],
        json={
            **body,
            "label": "Critical tax",
            "priority": "critical",
            "responsible_person": "Finance Lead",
        },
    )
    assert configured.status_code == 201
    assert configured.json()["priority"] == "critical"
    assert configured.json()["responsible_person"] == "Finance Lead"
    assert api.post(
        "/v1/obligations",
        headers=H["operator"],
        json={**body, "priority": "urgent"},
    ).status_code == 422


def first_id(api, label="Ade Stores supplier obligation"):
    items = api.get("/v1/obligations", headers=H["viewer"]).json()["items"]
    return next(i["id"] for i in items if i["label"] == label)


def test_request_approve_complete_flow_with_segregation_of_duties(api):
    seed(api)
    oid = first_id(api)
    body = {"obligation_id": oid, "kind": "request_extension", "note": "Ask for 3 days"}
    assert api.post("/v1/coordination-actions", headers=H["viewer"], json=body).status_code == 403
    created = api.post("/v1/coordination-actions", headers=H["operator"], json=body)
    assert created.status_code == 201
    aid = created.json()["id"]
    assert created.json()["status"] == "pending"
    # duplicate open request blocked
    assert api.post("/v1/coordination-actions", headers=H["operator"], json=body).status_code == 400
    # operator cannot approve; reject needs a reason
    assert api.post(f"/v1/coordination-actions/{aid}/decision", headers=H["operator"], json={"decision": "approve"}).status_code == 403
    assert api.post(f"/v1/coordination-actions/{aid}/decision", headers=H["approver"], json={"decision": "reject"}).status_code == 400
    # cannot complete before approval
    assert api.post(f"/v1/coordination-actions/{aid}/complete", headers=H["operator"], json={"outcome_note": "x"}).status_code == 400
    ok = api.post(f"/v1/coordination-actions/{aid}/decision", headers=H["approver"], json={"decision": "approve"})
    assert ok.status_code == 200 and ok.json()["status"] == "approved"
    # decided once only
    assert api.post(f"/v1/coordination-actions/{aid}/decision", headers=H["approver"], json={"decision": "approve"}).status_code == 400
    done = api.post(f"/v1/coordination-actions/{aid}/complete", headers=H["operator"], json={"outcome_note": "Supplier agreed to Friday"})
    assert done.json()["status"] == "completed"
    listed = api.get("/v1/coordination-actions", headers=H["viewer"]).json()["items"]
    assert listed[0]["obligation_label"] == "Ade Stores supplier obligation"
    actions = [e["action"] for e in api.get("/v1/audit", headers=H["viewer"]).json()["items"]]
    for a in ("request_coordination_action", "approve_coordination_action", "complete_coordination_action"):
        assert a in actions


def test_requester_who_is_also_approver_cannot_self_approve(api):
    seed(api)
    body = {"obligation_id": first_id(api), "kind": "request_extension"}
    aid = api.post("/v1/coordination-actions", headers=H["approver"], json=body).json()["id"]
    r = api.post(f"/v1/coordination-actions/{aid}/decision", headers=H["approver"], json={"decision": "approve"})
    assert r.status_code == 403


def test_split_needs_smaller_amount(api):
    seed(api)
    oid = first_id(api)
    bad = {"obligation_id": oid, "kind": "split_payment", "proposed_amount_kobo": 110000000}
    assert api.post("/v1/coordination-actions", headers=H["operator"], json=bad).status_code == 400
    assert api.post("/v1/coordination-actions", headers=H["operator"], json={**bad, "proposed_amount_kobo": 99000000}).status_code == 201
    assert api.post("/v1/coordination-actions", headers=H["operator"], json={"obligation_id": oid, "kind": "request_extension", "proposed_amount_kobo": 5}).status_code == 400


def test_bounded_agent_review_only_proposes_and_requires_approval(api):
    seed(api)
    deadline = "2026-11-26T17:00:00+00:00"
    forbidden = api.post(
        "/v1/agent/review",
        headers=H["viewer"],
        json={"deadline": deadline, "recovery_probability_bps": 6000},
    )
    assert forbidden.status_code == 403

    review = api.post(
        "/v1/agent/review",
        headers=H["operator"],
        json={"deadline": deadline, "recovery_probability_bps": 6000},
    )
    assert review.status_code == 200
    body = review.json()
    assert body["review_status"] == "completed"
    assert body["findings"]
    assert body["cash_position"]["available_funds_kobo"] == 99000000
    assert all(p["approval_required"] is True for p in body["proposals"])

    listed = api.get("/v1/coordination-actions", headers=H["viewer"]).json()["items"]
    assert len(listed) == len(body["proposals"])
    assert all(a["status"] == "pending" for a in listed)


def test_reseed_clears_actions(api):
    seed(api)
    api.post("/v1/coordination-actions", headers=H["operator"], json={"obligation_id": first_id(api), "kind": "request_extension"})
    seed(api)
    assert api.get("/v1/coordination-actions", headers=H["viewer"]).json()["items"] == []
