export function isAuthenticated(req, res, next) {
  if (req.session.user) return next();
  res.redirect("/");
}

export function isAdmin(req, res, next) {
  if (req.session.user?.role === "Admin") return next();
  res.redirect("/dashboard");
}
