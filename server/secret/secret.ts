
export const jwt_signing_key = "Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."

export const db_username = encodeURIComponent("default");
export const db_password = encodeURIComponent("default");
export const db_url = "localhost:27017";
export const db_auth_type = "DEFAULT";
export const db_full_uri = `mongodb://${db_username}:${db_password}@${db_url}/?authMechanism=${db_auth_type}`;

// invalidates existing passwords when changed
export const db_password_bcrypt_rounds = 12;

export const default_admin_username = "admin";
export const default_admin_password = "admin";

