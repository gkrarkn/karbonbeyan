from app.core.config import settings
from app.repositories.shipment_repository import ShipmentRepository


shipment_repository = ShipmentRepository(settings.database_url)
