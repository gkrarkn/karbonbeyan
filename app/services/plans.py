from __future__ import annotations

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


def get_plan_catalog() -> PlanCatalogResponse:
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

    current_access = WorkspaceAccessRecord(
        role="company_admin",
        role_label="Firma Yöneticisi",
        active_plan="growth",
        trial_status="active",
        trial_days_remaining=7,
        accessible_feature_keys=[feature.key for feature in pro_features],
        usage_counters={
            "reports_per_month": 8,
            "supplier_requests": 2,
            "team_members": 3,
        },
        usage_limits={
            "reports_per_month": 25,
            "supplier_requests": 15,
            "team_members": 10,
        },
        can_manage_billing=True,
    )

    return PlanCatalogResponse(
        trial_days=TRIAL_DAYS,
        current_access=current_access,
        plans=plans,
    )
