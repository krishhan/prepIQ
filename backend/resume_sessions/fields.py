import os
from django.db import models
from django.conf import settings
from cryptography.fernet import Fernet

class EncryptedTextField(models.BinaryField):
    description = "Encrypted text field using cryptography.fernet"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Ensure we initialize Fernet lazily so settings are loaded when needed.
        self._fernet = None

    @property
    def key(self):
        # Allow key override in settings, or fallback to environment directly
        key = getattr(settings, 'RESUME_ENCRYPTION_KEY', None)
        if not key:
            key = os.environ.get('RESUME_ENCRYPTION_KEY')
        if not key:
            raise ValueError("RESUME_ENCRYPTION_KEY must be set in settings or environment variables.")
        return key.encode() if isinstance(key, str) else key

    @property
    def fernet(self):
        if self._fernet is None:
            self._fernet = Fernet(self.key)
        return self._fernet

    def get_prep_value(self, value):
        if value is None:
            return None
        if isinstance(value, bytes):
            return value
        # Ensure we convert string to bytes, then encrypt
        value_bytes = value.encode('utf-8')
        encrypted_value = self.fernet.encrypt(value_bytes)
        return super().get_prep_value(encrypted_value)

    def from_db_value(self, value, expression, connection):
        if value is None:
            return value
        try:
            # value is bytes in DB. Decrypt it and convert to string.
            decrypted = self.fernet.decrypt(bytes(value))
            return decrypted.decode('utf-8')
        except Exception:
            # If decryption fails, return value as a string (or original string)
            if isinstance(value, bytes):
                return value.decode('utf-8', errors='ignore')
            return str(value)

    def to_python(self, value):
        if value is None:
            return value
        if isinstance(value, str):
            return value
        try:
            decrypted = self.fernet.decrypt(bytes(value))
            return decrypted.decode('utf-8')
        except Exception:
            if isinstance(value, bytes):
                return value.decode('utf-8', errors='ignore')
            return str(value)

    def get_internal_type(self):
        return "BinaryField"
