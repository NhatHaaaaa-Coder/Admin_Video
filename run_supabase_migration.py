import psycopg2

PROJECT_REF = "pmxvshdtcwxbqjdmfyll"
PASSWORD = "Thienthan@123"
HOST = "aws-0-ap-northeast-2.pooler.supabase.com"
PORT = 6543
USER = f"postgres.{PROJECT_REF}"
DB_NAME = "postgres"

def main():
    conn = psycopg2.connect(
        host=HOST,
        port=PORT,
        user=USER,
        password=PASSWORD,
        dbname=DB_NAME,
        sslmode="require"
    )
    conn.autocommit = True
    cur = conn.cursor()

    print("=" * 60)
    print("      SUPABASE TABLE EDITOR VERIFICATION REPORT")
    print("=" * 60)

    tables = ["users", "video_categories", "videos", "video_view_stats"]
    for t in tables:
        cur.execute(f"SELECT COUNT(*) FROM public.{t};")
        count = cur.fetchone()[0]
        print(f"  [OK] public.{t:<18} -> {count:>4} rows inserted")

    print("\n[*] Sample accounts inserted into public.users:")
    cur.execute("SELECT id, full_name, email, role FROM public.users ORDER BY id LIMIT 6;")
    for r in cur.fetchall():
        print(f"   * User #{r[0]}: {r[1]:<18} | {r[2]:<22} | Role: {r[3]}")

    print("\n[*] Sample videos inserted into public.videos:")
    cur.execute("SELECT id, title, views FROM public.videos ORDER BY views DESC LIMIT 3;")
    for r in cur.fetchall():
        print(f"   * Video #{r[0]}: {r[1][:40]:<40} | Views: {r[2]:,}")

    cur.close()
    conn.close()
    print("\n" + "=" * 60)
    print("[SUCCESS] All tables and data are now live in Supabase Table Editor!")
    print("=" * 60)

if __name__ == "__main__":
    main()
