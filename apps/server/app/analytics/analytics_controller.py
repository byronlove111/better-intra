from datetime import datetime

from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.analytics import analytics_service
from app.analytics.analytics_schemas import LogtimeAnalyticsOut
from app.deps import get_db, require_intra_linked
from app.users.user_model import User

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get(
    "/logtime",
    response_model=LogtimeAnalyticsOut,
    summary="My logtime analytics",
    description=(
        "Aggregates Intra location sessions: totals, active days, daily/weekly/weekday stats. "
        "Default range = last 30 days. Requires Intra linked."
    ),
)
def get_logtime_analytics(
    begin_at: datetime | None = Query(None),
    end_at: datetime | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_intra_linked),
) -> LogtimeAnalyticsOut:
    return analytics_service.get_my_logtime_analytics(
        db,
        user=current_user,
        begin_at=begin_at,
        end_at=end_at,
    )


@router.get(
    "/logtime/export.csv",
    summary="Export my logtime analytics as CSV",
    response_class=Response,
)
def export_logtime_csv(
    begin_at: datetime | None = Query(None),
    end_at: datetime | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_intra_linked),
) -> Response:
    data = analytics_service.get_my_logtime_analytics(
        db,
        user=current_user,
        begin_at=begin_at,
        end_at=end_at,
    )
    csv_text = analytics_service.analytics_to_csv(data)
    filename = f"logtime-{data.login}.csv"
    return Response(
        content=csv_text,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get(
    "/logtime/export.pdf",
    summary="Export my logtime analytics as PDF",
    response_class=Response,
)
def export_logtime_pdf(
    begin_at: datetime | None = Query(None),
    end_at: datetime | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_intra_linked),
) -> Response:
    data = analytics_service.get_my_logtime_analytics(
        db,
        user=current_user,
        begin_at=begin_at,
        end_at=end_at,
    )
    pdf_bytes = analytics_service.analytics_to_pdf(data)
    filename = f"logtime-{data.login}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
