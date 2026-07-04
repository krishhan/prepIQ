# This will make sure the app is always imported when
# Django starts so that shared_task will use this app.
import sys
from .celery import app as celery_app

__all__ = ('celery_app',)

# Monkeypatch Django context copying for Python 3.14 compatibility
if sys.version_info >= (3, 14):
    try:
        from django.template.context import BaseContext
        def patched_copy(self):
            duplicate = self.__class__()
            duplicate.dicts = getattr(self, 'dicts', [])[:]
            return duplicate
        BaseContext.__copy__ = patched_copy
    except ImportError:
        pass
