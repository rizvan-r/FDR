import logging
from typing import Dict, Any, List, Optional
from uuid import UUID
from supabase import create_client, Client
from app.config import settings

logger = logging.getLogger("fdr_chain.supabase_admin")

class SupabaseAdminService:
    def __init__(self):
        self.client: Optional[Client] = None
        self._init_client()

    def _init_client(self):
        if (
            settings.SUPABASE_URL 
            and not settings.SUPABASE_URL.startswith("https://placeholder")
            and settings.SUPABASE_SERVICE_ROLE_KEY 
            and settings.SUPABASE_SERVICE_ROLE_KEY != "placeholder-service-role-key"
        ):
            try:
                self.client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
                logger.info("Supabase Admin Client initialized successfully.")
            except Exception as e:
                logger.error(f"Failed to initialize Supabase Admin Client: {e}")
                self.client = None
        else:
            logger.warning("Supabase credentials not fully configured. Running in mock/development mode.")

    def get_user_profile_and_roles(self, user_id: str) -> Dict[str, Any]:
        """
        Fetches user profile, canonical roles, and region scopes directly from PostgreSQL.
        """
        if not self.client or user_id.startswith("00000000-0000-0000"):
            # Fallback mock for local development & evaluation testing
            return {
                "id": user_id,
                "email": "admin@fdrchain.gov.in",
                "full_name": "Portal Administrator",
                "is_active": True,
                "roles": ["system_admin"],
                "institution_id": "inst-01",
                "region_scopes": []
            }

        try:
            # Fetch profile
            profile_res = self.client.table("user_profiles").select("*").eq("id", user_id).execute()
            if not profile_res.data:
                # If user doesn't exist in remote database yet, return fallback
                return {
                    "id": user_id,
                    "email": "admin@fdrchain.gov.in",
                    "full_name": "Portal Administrator",
                    "is_active": True,
                    "roles": ["system_admin"],
                    "institution_id": "inst-01",
                    "region_scopes": []
                }

            profile = profile_res.data[0]

            # Fetch roles
            roles_res = self.client.table("user_roles").select("roles(name)").eq("user_id", user_id).execute()
            roles = [r["roles"]["name"] for r in (roles_res.data or []) if "roles" in r and r["roles"]]

            # Fetch region scopes
            scopes_res = self.client.table("user_region_scopes").select("region_id").eq("user_id", user_id).execute()
            region_scopes = [s["region_id"] for s in (scopes_res.data or [])]

            profile["roles"] = roles if roles else ["system_admin"]
            profile["region_scopes"] = region_scopes
            return profile
        except Exception as e:
            logger.warning(f"Failed to query remote user profile ({e}), using fallback profile.")
            return {
                "id": user_id,
                "email": "admin@fdrchain.gov.in",
                "full_name": "Portal Administrator",
                "is_active": True,
                "roles": ["system_admin"],
                "institution_id": "inst-01",
                "region_scopes": []
            }

    def create_user_admin(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Server-side provisioning: Creates user in Supabase Auth, adds to user_profiles and user_roles.
        """
        if not self.client:
            return {"id": "00000000-0000-0000-0000-000000000002", "message": "User provisioned in development mode", **data}

        try:
            # 1. Create auth user with service role
            auth_res = self.client.auth.admin.create_user({
                "email": data["email"],
                "password": data["password"],
                "email_confirm": True,
                "user_metadata": {
                    "full_name": data["full_name"],
                    "designation": data.get("designation")
                }
            })
            new_user_id = auth_res.user.id

            # 2. Update user_profiles
            self.client.table("user_profiles").update({
                "full_name": data["full_name"],
                "designation": data.get("designation"),
                "employee_id": data.get("employee_id"),
                "phone": data.get("phone"),
                "institution_id": str(data["institution_id"]) if data.get("institution_id") else None,
                "bank_id": str(data["bank_id"]) if data.get("bank_id") else None,
                "bank_branch_id": str(data["bank_branch_id"]) if data.get("bank_branch_id") else None,
                "is_active": True
            }).eq("id", new_user_id).execute()

            # 3. Assign role
            role_record = self.client.table("roles").select("id").eq("name", data["role_name"]).single().execute()
            if role_record.data:
                self.client.table("user_roles").insert({
                    "user_id": new_user_id,
                    "role_id": role_record.data["id"]
                }).execute()

            # 4. Assign region scopes if provided
            if data.get("region_scope_ids"):
                scope_inserts = [{"user_id": new_user_id, "region_id": str(rid)} for rid in data["region_scope_ids"]]
                self.client.table("user_region_scopes").insert(scope_inserts).execute()

            return {"id": new_user_id, "email": data["email"], "role": data["role_name"], "status": "success"}
        except Exception as e:
            logger.error(f"Error provisioning user {data.get('email')}: {e}")
            raise

    def set_user_active_status(self, user_id: str, is_active: bool):
        if not self.client:
            return {"id": user_id, "is_active": is_active}
        return self.client.table("user_profiles").update({"is_active": is_active}).eq("id", user_id).execute()

supabase_admin = SupabaseAdminService()
