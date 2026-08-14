"""Unit tests — evaluation mapping (project name + feedbacks)."""

from app.intra.intra_service import _team_project_name, build_evaluation


def test_team_project_name_uses_gitlab_path_not_team_name() -> None:
    name, slug = _team_project_name(
        {
            "name": "zmata's team",
            "project_id": 1336,
            "project_gitlab_path": "pedago_world/42-cursus/inner-circle/ft_irc",
            "project": None,
        }
    )
    assert name == "ft_irc"
    assert slug == "ft_irc"


def test_team_project_name_prefers_nested_project() -> None:
    name, slug = _team_project_name(
        {
            "name": "some team",
            "project_gitlab_path": "pedago_world/webserv",
            "project": {"name": "Webserv", "slug": "webserv"},
        }
    )
    assert name == "Webserv"
    assert slug == "webserv"


def test_build_evaluation_includes_feedbacks() -> None:
    item = {
        "id": 9411264,
        "begin_at": "2026-05-26T14:15:00.000Z",
        "final_mark": 100,
        "comment": "Tres bon boulot",
        "corrector": {"login": "ibaaziz"},
        "correcteds": [{"login": "zmata"}, {"login": "slatrech"}],
        "team": {
            "name": "zmata's team",
            "project_id": 1336,
            "project_gitlab_path": "pedago_world/42-cursus/inner-circle/ft_irc",
        },
        "feedbacks": [
            {
                "user": {"login": "zmata"},
                "rating": 5,
                "comment": "Merci!",
                "feedback_details": [
                    {"kind": "nice", "rate": 4},
                    {"kind": "punctuality", "rate": 5},
                ],
            }
        ],
    }
    out = build_evaluation(item, role="corrected")
    assert out["project_name"] == "ft_irc"
    assert out["project_slug"] == "ft_irc"
    assert out["project_id"] == 1336
    assert out["team_name"] == "zmata's team"
    assert out["corrector_login"] == "ibaaziz"
    assert out["feedbacks"] == [
        {
            "from_login": "zmata",
            "rating": 5,
            "comment": "Merci!",
            "details": [
                {"kind": "nice", "rate": 4},
                {"kind": "punctuality", "rate": 5},
            ],
        }
    ]
