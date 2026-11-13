const bcrypt = require('bcryptjs');
const { HttpError } = require('../middleware/errorHandler');
const usersRepository = require('../users/users.repository');
const SALT_ROUNDS = 12;
function userNotFoundError() { return new HttpError(404, 'USER_NOT_FOUND', 'User not found'); }
async function lookupUser(req, res) {
  const user = await usersRepository.findForInternalLookup(req.validatedQuery);
  if (!user) throw userNotFoundError();
  return res.status(200).json({ userId: user.id, status: user.status });
}
async function verifyCredentials(req, res) {
  const user = await usersRepository.findCredentialRecordById(req.params.id);
  if (!user) throw userNotFoundError();
  const valid = Boolean(user.passwordHash) && await bcrypt.compare(req.validatedBody.plaintextPassword, user.passwordHash);
  return res.status(200).json({ valid, status: user.status, organizationId: user.organizationId });
}
async function patchPasswordHash(req, res) {
  const hash = await bcrypt.hash(req.validatedBody.newPlaintextPassword, SALT_ROUNDS);
  if (!await usersRepository.updatePasswordHash(req.params.id, hash)) throw userNotFoundError();
  return res.status(204).send();
}
async function getInternalUser(req, res) {
  const user = await usersRepository.findInternalStatusById(req.params.id);
  if (!user) throw userNotFoundError();
  return res.status(200).json(user);
}
module.exports = { lookupUser, verifyCredentials, patchPasswordHash, getInternalUser };