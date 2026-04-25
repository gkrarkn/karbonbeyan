from app.core.config import settings
from app.repositories.shipment_repository import ShipmentRepository
from app.repositories.user_repository import UserRepository


shipment_repository = ShipmentRepository(settings.database_url)
user_repository = UserRepository(shipment_repository._session_factory)
