"""Integration — auth register / login / refresh / me."""

from fastapi.testclient import TestClient

from tests.conftest import auth_header, register_user


def test_register_login_me_refresh_flow(client: TestClient) -> None:
    created = register_user(client, email="auth@example.com", password="password123")
    assert "access_token" in created
    assert "refresh_token" in created
    assert created["user"]["email"] == "auth@example.com"
    assert created["user"]["is_intra_linked"] is False

    me = client.get("/auth/me", headers=auth_header(created["access_token"]))
    assert me.status_code == 200
    assert me.json()["email"] == "auth@example.com"

    login = client.post(
        "/auth/login",
        json={"email": "auth@example.com", "password": "password123"},
    )
    assert login.status_code == 200
    tokens = login.json()

    refreshed = client.post("/auth/refresh", json={"refresh_token": tokens["refresh_token"]})
    assert refreshed.status_code == 200
    assert "access_token" in refreshed.json()


def test_register_duplicate_email(client: TestClient) -> None:
    register_user(client, email="dup@example.com")
    again = client.post(
        "/auth/register",
        json={"email": "dup@example.com", "password": "password123"},
    )
    assert again.status_code == 409


def test_login_bad_password(client: TestClient) -> None:
    register_user(client, email="badpw@example.com")
    response = client.post(
        "/auth/login",
        json={"email": "badpw@example.com", "password": "wrong-password"},
    )
    assert response.status_code == 401


def test_me_without_token(client: TestClient) -> None:
    assert client.get("/auth/me").status_code == 401


def test_me_with_refresh_token_rejected(client: TestClient) -> None:
    created = register_user(client, email="wrongtype@example.com")
    response = client.get("/auth/me", headers=auth_header(created["refresh_token"]))
    assert response.status_code == 401


def test_register_short_password(client: TestClient) -> None:
    response = client.post(
        "/auth/register",
        json={"email": "short@example.com", "password": "short"},
    )
    assert response.status_code == 422
