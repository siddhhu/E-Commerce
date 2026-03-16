import json
import os
from typing import Optional, Dict, Any

import firebase_admin
from firebase_admin import credentials, auth
from fastapi import HTTPException, status

from app.config import settings

class FirebaseService:
    def __init__(self):
        self._initialize_app()
        
    def _initialize_app(self):
        """Initialize Firebase Admin SDK if not already initialized."""
        if not firebase_admin._apps:
            try:
                # 1. Try loading from Environment Variable (JSON string)
                # This is preferred for Render/Cloud deployment
                env_json = os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON")
                if env_json:
                    try:
                        service_account_info = json.loads(env_json)
                        cred = credentials.Certificate(service_account_info)
                        firebase_admin.initialize_app(cred)
                        print("Firebase initialized using environment variable JSON.")
                        return
                    except Exception as e:
                        print(f"Failed to initialize Firebase from env var: {e}")

                # 2. Fallback: Try loading from local file
                cred_path = settings.firebase_service_account_path
                
                # If path is not absolute, make it relative to the backend root
                if not os.path.isabs(cred_path):
                    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
                    cred_path = os.path.join(base_dir, cred_path)
                
                if os.path.exists(cred_path):
                    cred = credentials.Certificate(cred_path)
                    firebase_admin.initialize_app(cred)
                    print(f"Firebase initialized from file: {cred_path}")
                else:
                    print(f"WARNING: Firebase credentials not found (checked ENV and {cred_path}). OTP will not work.")
            except Exception as e:
                print(f"Failed to initialize Firebase: {e}")

    async def verify_id_token(self, id_token: str) -> Dict[str, Any]:
        """
        Verify the Firebase ID Token.
        Returns the decoded token dictionary if valid, otherwise raises HTTPException.
        """
        try:
            # Verify the token using Firebase Admin SDK
            decoded_token = auth.verify_id_token(id_token)
            return decoded_token
        except auth.ExpiredIdTokenError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Firebase token has expired",
            )
        except auth.RevokedIdTokenError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Firebase token has been revoked",
            )
        except auth.InvalidIdTokenError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid Firebase token",
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Firebase authentication failed: {str(e)}",
            )

firebase_service = FirebaseService()
