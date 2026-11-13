import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location("assetlinks", Path(__file__).parents[1] / "scripts/assetlinks.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class AssociationTests(unittest.TestCase):
    def test_certificate_is_normalized(self):
        value = ":".join(["ab"] * 32)
        target = module.generate(value)[0]["target"]
        self.assertEqual(target["sha256_cert_fingerprints"], [value.upper()])
        self.assertEqual(target["namespace"], "android_app")

    def test_invalid_certificates_cannot_be_published(self):
        for value in ["", "REPLACE_ME", "AA:BB", "00" * 32, ":".join(["GG"] * 32)]:
            with self.subTest(value=value):
                with self.assertRaises(ValueError):
                    module.generate(value)
