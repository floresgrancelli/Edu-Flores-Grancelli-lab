"""Two real PostgreSQL connections, fictitious independent account B only."""
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
import subprocess

barrier = Barrier(2)
def save(label):
    barrier.wait(timeout=10)
    sql = "set role service_role; select public.ncc_self_save_intake('00000000-0000-4000-8000-000000000002','concurrent_" + label + "',0,'{\"processingConsent\":true,\"weight_kg\":80}');"
    return subprocess.run(["psql", "-X", "-Atq", "-v", "ON_ERROR_STOP=1", "-v", "VERBOSITY=verbose", "-c", sql], capture_output=True, text=True, timeout=20)

with ThreadPoolExecutor(max_workers=2) as pool:
    futures = [pool.submit(save, label) for label in ["one", "two"]]
    results = [future.result() for future in futures]
assert sum(result.returncode == 0 for result in results) == 1, "Exactly one concurrent write must succeed"
assert sum("PT409" in result.stderr for result in results) == 1, "Second device must receive a conflict"
check = subprocess.run(["psql", "-X", "-Atq", "-v", "ON_ERROR_STOP=1", "-c", "select count(*),max(revision) from public.ncc_self_intakes where user_id='00000000-0000-4000-8000-000000000002'"], capture_output=True, text=True, check=True, timeout=10)
assert check.stdout.strip() == "1|1", "Concurrent saves cannot overwrite or duplicate the same revision"
print("Two-connection intake concurrency passed: one commit, one conflict, one preserved revision")
