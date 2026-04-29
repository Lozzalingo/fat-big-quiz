const express = require('express');
const { validate } = require('../middleware/validate');
const { campaignCreate, campaignUpdate } = require('../middleware/schemas');
const router = express.Router();

const {
  getAllCampaigns,
  getCampaign,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  previewCampaign,
  sendTestEmail,
  sendCampaign,
} = require('../controllers/campaigns');

router.get('/', getAllCampaigns);
router.get('/:id', getCampaign);
router.post('/', validate(campaignCreate), createCampaign);
router.put('/:id', validate(campaignUpdate), updateCampaign);
router.delete('/:id', deleteCampaign);
router.post('/preview', previewCampaign);
router.post('/test-send', sendTestEmail);
router.post('/:id/send', sendCampaign);

module.exports = router;
