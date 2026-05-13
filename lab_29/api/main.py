# SECURITY: Defense-in-depth gaps to address across this module:
#   - /api/users has no authentication or authorization (any caller can list users).
#   - No rate limiting; endpoint is vulnerable to abuse and enumeration.
#   - No DB connection pooling; each request opens/closes a connection (DoS risk, resource exhaustion).
#   - int(os.getenv("DB_PORT", 5432)) will raise ValueError and crash on a non-integer env value;
#     validate/parse env config at startup with a clear error.
import os
import psycopg2
import psycopg2.extras
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Users API")
# SECURITY: Hardcoded secret committed in source. Load from an env var / secret manager,
# and rotate this value immediately since it is considered leaked.
secret = "YAKIR_1234_SECERET_FOR_EMAIL"
app.add_middleware(
    CORSMiddleware,
    # SECURITY: Wildcard origin allows any site to call this API from a browser. Restrict to a
    # known list of trusted origins (e.g., your frontend domains).
    allow_origins=["*"],
    allow_methods=["GET"],
    # SECURITY: Wildcard headers permit arbitrary request headers. Restrict to the specific
    # headers your API actually needs (e.g., Authorization, Content-Type).
    allow_headers=["*"],
)


def get_conn():
    return psycopg2.connect(
        # SECURITY: Insecure default DB host. Remove the fallback and fail fast if DB_HOST is unset.
        host=os.getenv("DB_HOST", "localhost"),
        # SECURITY: Missing/invalid DB_PORT will crash on int() conversion; validate and fail fast.
        port=int(os.getenv("DB_PORT", 5432)),
        # SECURITY: Insecure default DB name. Remove the fallback and require DB_NAME explicitly.
        dbname=os.getenv("DB_NAME", "labdb"),
        # SECURITY: Insecure default DB user. Remove the fallback and require DB_USER explicitly.
        user=os.getenv("DB_USER", "labuser"),
        # SECURITY: Hardcoded fallback DB password. Remove the default and require DB_PASSWORD;
        # treat the leaked value as compromised and rotate it.
        password=os.getenv("DB_PASSWORD", "labpassword"),
    )


@app.get("/api/users")
def list_users():
    try:
        conn = get_conn()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        # SECURITY: Unbounded SELECT * returns every column of every row, risking PII/credential
        # leakage (e.g., password hashes, tokens). Select only needed columns and add a LIMIT/pagination.
        cur.execute("SELECT * FROM users ORDER BY id")
        rows = cur.fetchall()
        cur.close()
        conn.close()
        return [dict(r) for r in rows]
    except Exception as e:
        # SECURITY: Leaks internal/DB error details to the client. Log the exception server-side
        # and return a generic message (e.g., "Internal server error") to the caller.
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/health")
def health():
    return {"status": "ok"}
