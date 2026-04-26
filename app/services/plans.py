from __future__ import annotations

from datetime import datetime, timedelta, timezone
from math import ceil

from app.models.auth import UserRecord
from app.models.cbam import (
    PlanCatalogResponse,
    PlanFeatureRecord,
    PlanRecord,
    WorkspaceAccessRecord,
)


TRIAL_DAYS = 7

PLAN_FEATURES = {
    "archive_filters": PlanFeatureRecord(
        key="archive_filters",
        label="Gelişmiş Arşiv Filtreleri",
        description="Durum, sektör ve referans bazlı filtreleme ile PDF yeniden indirme.",
    ),
    "verification_workspace": PlanFeatureRecord(
        key="verification_workspace",
        label="Verification Workspace",
        description="İç inceleme, verifier takibi ve kanıt paketleme akışı.",
    ),
    "supplier_data_collection": PlanFeatureRecord(
        key="supplier_data_collection",
        label="Supplier Data Collection",
        description="Tedarikçiden actual veri ve kanıt dokümanı toplama modülü.",
    ),
    "team_collaboration": PlanFeatureRecord(
        key="team_collaboration",
        label="Takım Çalışması",
        description="Rol bazlı erişim, görev paylaşımı ve çok kullanıcılı operasyon ekranı.",
    ),
    "api_access": PlanFeatureRecord(
        key="api_access",
        label="API Erişimi",
        description="ERP veya iç sistemlerle veri senkronizasyonu için entegrasyon uçları.",
    ),
}


def _aware_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def get_trial_days_remaining(user: UserRecord | None, now: datetime | None = None) -> int:
    if not user:
        return TRIAL_DAYS
    current_time = now or datetime.now(timezone.utc)
    trial_ends_at = _aware_utc(user.created_at) + timedelta(days=TRIAL_DAYS)
    remaining_seconds = (trial_ends_at - current_time).total_seconds()
    if remaining_seconds <= 0:
        return 0
    return min(TRIAL_DAYS, ceil(remaining_seconds / 86400))


def is_trial_active(user: UserRecord | None, now: datetime | None = None) -> bool:
    return get_trial_days_remaining(user, now=now) > 0


def is_paid_subscription_active(user: UserRecord | None) -> bool:
    return bool(
        user
        and user.subscription_status == "active"
        and user.active_plan in {"starter", "growth", "pro"}
    )


def get_plan_catalog(reports_count: int = 0, user: UserRecord | None = None) -> PlanCatalogResponse:
    starter_features = [
        PLAN_FEATURES["archive_filters"],
    ]
    growth_features = starter_features + [
        PLAN_FEATURES["verification_workspace"],
        PLAN_FEATURES["team_collaboration"],
    ]
    pro_features = growth_features + [
        PLAN_FEATURES["supplier_data_collection"],
        PLAN_FEATURES["api_access"],
    ]

    plans = [
        PlanRecord(
            plan_id="starter",
            name="Starter",
            tagline="İlk CBAM operasyonunu düzenli hale getiren KOBİ paketi.",
            monthly_price_eur=59,
            usage_limits={
                "reports_per_month": 15,
                "supplier_requests": 0,
                "team_members": 1,
            },
            features=starter_features,
        ),
        PlanRecord(
            plan_id="growth",
            name="Growth",
            tagline="İç inceleme ve ekip koordinasyonunu yöneten büyüyen ihracatçılar için.",
            monthly_price_eur=229,
            usage_limits={
                "reports_per_month": 75,
                "supplier_requests": 0,
                "team_members": 5,
            },
            features=growth_features,
            recommended=True,
        ),
        PlanRecord(
            plan_id="pro",
            name="Pro",
            tagline="Çok tesisli yapı, tedarikçi veri toplama ve ileri entegrasyon seviyesi.",
            monthly_price_eur=599,
            usage_limits={
                "reports_per_month": 250,
                "supplier_requests": 100,
                "team_members": 20,
            },
            features=pro_features,
        ),
    ]

    trial_days_remaining = get_trial_days_remaining(user)
    trial_active = trial_days_remaining > 0
    paid_active = is_paid_subscription_active(user)
    paid_plan = user.active_plan if paid_active else ""
    paid_plan_record = next((plan for plan in plans if plan.plan_id == paid_plan), None)

    if trial_active:
        accessible_feature_keys = [feature.key for feature in pro_features]
        usage_limits = {
            "reports_per_month": 25,
            "supplier_requests": 15,
            "team_members": 10,
        }
        active_plan = "trial"
        trial_status = "active"
    elif paid_plan_record:
        accessible_feature_keys = [feature.key for feature in paid_plan_record.features]
        usage_limits = paid_plan_record.usage_limits
        active_plan = paid_plan_record.plan_id
        trial_status = "expired"
    else:
        accessible_feature_keys = []
        usage_limits = {
            "reports_per_month": 0,
            "supplier_requests": 0,
            "team_members": 1,
        }
        active_plan = "none"
        trial_status = "expired"

    current_access = WorkspaceAccessRecord(
        role="company_admin",
        role_label="Firma Yöneticisi",
        active_plan=active_plan,
        trial_status=trial_status,
        trial_days_remaining=trial_days_remaining,
        accessible_feature_keys=accessible_feature_keys,
        usage_counters={
            "reports_per_month": reports_count,
            "supplier_requests": 0,
            "team_members": 1,
        },
        usage_limits=usage_limits,
        can_manage_billing=True,
    )

    return PlanCatalogResponse(
        trial_days=TRIAL_DAYS,
        current_access=current_access,
        plans=plans,
    )


def can_create_report(user: UserRecord, reports_count: int) -> bool:
    access = get_plan_catalog(reports_count=reports_count, user=user).current_access
    limit = access.usage_limits.get("reports_per_month", 0)
    return limit > 0 and reports_count < limit


def can_download_report(user: UserRecord) -> bool:
    access = get_plan_catalog(user=user).current_access
    return access.usage_limits.get("reports_per_month", 0) > 0
