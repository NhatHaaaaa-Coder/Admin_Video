import psycopg2

def main():
    conn = psycopg2.connect(
        host="aws-0-ap-northeast-2.pooler.supabase.com",
        port=6543,
        user="postgres.pmxvshdtcwxbqjdmfyll",
        password="Thienthan@123",
        dbname="postgres",
        sslmode="require"
    )
    conn.autocommit = True
    cur = conn.cursor()

    print("[*] Ensuring pgcrypto extension...")
    cur.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto;")

    print("[*] Synchronizing public.users into Supabase auth.users...")
    cur.execute("""
        INSERT INTO auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at
        )
        SELECT
            '00000000-0000-0000-0000-000000000000'::uuid,
            gen_random_uuid(),
            'authenticated',
            'authenticated',
            u.email,
            crypt(u.password_hash, gen_salt('bf')),
            NOW(),
            '{"provider":"email","providers":["email"]}'::jsonb,
            jsonb_build_object('full_name', u.full_name, 'role', u.role),
            u.created_at,
            NOW()
        FROM public.users u
        WHERE NOT EXISTS (
            SELECT 1 FROM auth.users au WHERE au.email = u.email
        );
    """)

    print("[*] Synchronizing auth.identities...")
    cur.execute("""
        INSERT INTO auth.identities (
            id,
            user_id,
            identity_data,
            provider,
            provider_id,
            last_sign_in_at,
            created_at,
            updated_at
        )
        SELECT
            gen_random_uuid(),
            u.id,
            jsonb_build_object('sub', u.id::text, 'email', u.email),
            'email',
            u.id::text,
            NOW(),
            NOW(),
            NOW()
        FROM auth.users u
        WHERE NOT EXISTS (
            SELECT 1 FROM auth.identities i WHERE i.user_id = u.id
        );
    """)

    cur.execute("SELECT count(*) FROM auth.users;")
    user_count = cur.fetchone()[0]
    cur.execute("SELECT count(*) FROM auth.identities;")
    ident_count = cur.fetchone()[0]

    print(f"[+] Total accounts in Supabase auth.users: {user_count}")
    print(f"[+] Total identities in Supabase auth.identities: {ident_count}")

    cur.close()
    conn.close()

if __name__ == "__main__":
    main()
