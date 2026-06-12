const express = require('express')
const router = express.Router()
const authController = require('../controllers/authController')
const boilerController = require('../controllers/boilerController')
const adminController = require('../controllers/adminController')
const mailController = require('../controllers/mailController')
const { verifyToken, checkRole } = require('../middleware/auth')

router.post('/auth/register', authController.register)
  /* #swagger.tags = ['Auth'] */
router.post('/auth/login', authController.login)
  /* #swagger.tags = ['Auth'] */
router.post('/auth/verify-mfa', authController.verifyMfa)
  /* #swagger.tags = ['Auth'] */
router.get('/auth/me', verifyToken, authController.me)
  /* #swagger.tags = ['Auth'] */
router.post('/auth/logout', verifyToken, authController.logout)
  /* #swagger.tags = ['Auth'] */
router.post('/auth/mfa/setup', verifyToken, authController.setupMfa)
  /* #swagger.tags = ['Auth'] */
router.post('/auth/mfa/enable', verifyToken, authController.enableMfa)
  /* #swagger.tags = ['Auth'] */
router.post('/auth/mfa/disable', verifyToken, authController.disableMfa)
  /* #swagger.tags = ['Auth'] */
router.post('/auth/change-password', verifyToken, authController.changePassword)
  /* #swagger.tags = ['Auth'] */

router.post('/messages', verifyToken, mailController.sendMessage)
  /* #swagger.tags = ['Messages'] */
router.get('/messages/inbox', verifyToken, mailController.getInbox)
  /* #swagger.tags = ['Messages'] */
router.get('/messages/sent', verifyToken, mailController.getSent)
  /* #swagger.tags = ['Messages'] */
router.get('/messages/:id', verifyToken, mailController.getMessageById)
  /* #swagger.tags = ['Messages'] */

router.get('/boilers/deleted', verifyToken, checkRole(['admin', 'chief']), boilerController.getDeletedBoilers)
  /* #swagger.tags = ['Boilers'] */
router.put('/boilers/:id/restore', verifyToken, checkRole(['admin', 'chief']), boilerController.restoreBoiler)
  /* #swagger.tags = ['Boilers'] */
router.get('/boilers', verifyToken, boilerController.getBoilers)
  /* #swagger.tags = ['Boilers'] */
router.post('/boilers', verifyToken, checkRole(['admin', 'chief']), boilerController.createBoiler)
  /* #swagger.tags = ['Boilers'] */
router.put('/boilers/:id', verifyToken, boilerController.updateBoiler)
  /* #swagger.tags = ['Boilers'] */
router.put('/boilers/:id/status', verifyToken, boilerController.updateBoiler)
  /* #swagger.tags = ['Boilers'] */
router.delete('/boilers/:id', verifyToken, checkRole(['admin', 'chief']), boilerController.deleteBoiler)
  /* #swagger.tags = ['Boilers'] */

router.get('/assignments', verifyToken, boilerController.getAssignments)
  /* #swagger.tags = ['Assignments'] */
router.post('/assignments', verifyToken, checkRole(['admin', 'chief']), boilerController.assignOperator)
  /* #swagger.tags = ['Assignments'] */
router.delete('/assignments/:id', verifyToken, checkRole(['admin', 'chief']), boilerController.removeAssignment)
  /* #swagger.tags = ['Assignments'] */

router.get('/stop-requests', verifyToken, boilerController.getStopRequests)
  /* #swagger.tags = ['Stop Requests'] */
router.post('/stop-requests', verifyToken, boilerController.createStopRequest)
  /* #swagger.tags = ['Stop Requests'] */
router.delete('/stop-requests/:id', verifyToken, checkRole(['admin', 'chief']), boilerController.deleteStopRequest)
  /* #swagger.tags = ['Stop Requests'] */

router.get('/admin/users', verifyToken, checkRole(['admin', 'chief']), adminController.getUsers)
  /* #swagger.tags = ['Admin'] */
router.get('/admin/users/deleted', verifyToken, checkRole(['admin', 'chief']), adminController.getDeletedUsers)
  /* #swagger.tags = ['Admin'] */
router.get('/contacts', verifyToken, adminController.getContacts)
  /* #swagger.tags = ['Admin'] */
router.put('/admin/users/:id/restore', verifyToken, checkRole(['admin']), adminController.restoreUser)
  /* #swagger.tags = ['Admin'] */
router.put('/admin/users/:id', verifyToken, checkRole(['admin']), adminController.updateUserFields)
  /* #swagger.tags = ['Admin'] */
router.delete('/admin/users/:id', verifyToken, checkRole(['admin']), adminController.deleteUser)
  /* #swagger.tags = ['Admin'] */
router.get('/admin/logs', verifyToken, checkRole(['admin']), adminController.getLogs)
  /* #swagger.tags = ['Admin'] */

module.exports = router