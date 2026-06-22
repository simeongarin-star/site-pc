require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

app.post('/api/devis', async (req, res) => {
  const { nom, email, buildType, budget, projet } = req.body;

  if (!nom || !email || !buildType || !budget || !projet) {
    return res.status(400).json({ error: 'Tous les champs sont obligatoires.' });
  }

  const mailOptions = {
    from: `"Hélix Site" <${process.env.GMAIL_USER}>`,
    to: 'simeongarin@gmail.com',
    replyTo: email,
    subject: `Nouvelle demande de devis — ${nom}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; color: #1a1a2e; background: #f8faff; padding: 32px; border-radius: 8px;">
        <h1 style="font-size: 22px; margin-bottom: 4px; color: #0d0f1a;">Nouvelle demande de devis</h1>
        <p style="color: #666; margin-top: 0;">Reçue via le formulaire du site Hélix</p>
        <hr style="border: none; border-top: 1px solid #e0e4f0; margin: 24px 0;">

        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; font-weight: 600; width: 140px; color: #444;">Nom</td>
            <td style="padding: 8px 0;">${escapeHtml(nom)}</td>
          </tr>
          <tr style="background: #f0f4ff;">
            <td style="padding: 8px 0; font-weight: 600; color: #444;">Email client</td>
            <td style="padding: 8px 0;"><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: 600; color: #444;">Type de build</td>
            <td style="padding: 8px 0;">${escapeHtml(buildType)}</td>
          </tr>
          <tr style="background: #f0f4ff;">
            <td style="padding: 8px 0; font-weight: 600; color: #444;">Budget</td>
            <td style="padding: 8px 0;">${escapeHtml(budget)}</td>
          </tr>
        </table>

        <hr style="border: none; border-top: 1px solid #e0e4f0; margin: 24px 0;">

        <p style="font-weight: 600; color: #444; margin-bottom: 8px;">Description du projet</p>
        <p style="background: #fff; border-left: 3px solid #3fe1ff; padding: 12px 16px; margin: 0; white-space: pre-wrap;">${escapeHtml(projet)}</p>

        <hr style="border: none; border-top: 1px solid #e0e4f0; margin: 24px 0;">
        <p style="font-size: 12px; color: #999;">Message envoyé automatiquement depuis helix-builds.fr</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.json({ success: true });
  } catch (err) {
    console.error('Erreur envoi mail :', err.message);
    res.status(500).json({ error: 'Impossible d\'envoyer le mail. Réessaye plus tard.' });
  }
});

// Toutes les autres routes → page principale
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'Helix.dc.html'));
});

app.listen(PORT, () => {
  console.log(`Hélix server → http://localhost:${PORT}`);
});

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
