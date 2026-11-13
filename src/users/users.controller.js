*** Begin Patch
*** Update File: src/users/users.controller.js
@@
-function uniqueTakenError() {
-  return new HttpError(409, 'USER_EMAIL_TAKEN', 'Email or username already exists in this organization');
+function uniqueTakenError(err) {
+  const isEmail = String(err && err.constraint || '').includes('email');
+  return new HttpError(409, isEmail ? 'USER_EMAIL_TAKEN' : 'USER_USERNAME_TAKEN', isEmail
+    ? 'A user with this email already exists in this organization'
+    : 'A user with this username already exists in this organization');
@@
-      throw uniqueTakenError();
+      throw uniqueTakenError(err);
@@
-      throw uniqueTakenError();
+      throw uniqueTakenError(err);
*** End Patch