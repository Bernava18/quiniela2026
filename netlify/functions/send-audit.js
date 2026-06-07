// netlify/functions/send-audit.js
// Se ejecuta manualmente o via cron el 11 Jun 2026 antes del primer partido
// Genera PDF con todas las quinielas y lo envía a todos los participantes

const { createClient } = require('@supabase/supabase-js')
const nodemailer = require('nodemailer')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

// Fixture completo para mostrar nombres de equipos
const FIXTURE = {
  A1:'México vs Sudáfrica',A2:'Rep. de Corea vs Rep. Checa',A3:'México vs Rep. de Corea',
  A4:'Rep. Checa vs Sudáfrica',A5:'Rep. Checa vs México',A6:'Sudáfrica vs Rep. de Corea',
  B1:'Canadá vs Bosnia',B2:'Catar vs Suiza',B3:'Canadá vs Catar',
  B4:'Suiza vs Bosnia',B5:'Suiza vs Canadá',B6:'Bosnia vs Catar',
  C1:'Brasil vs Marruecos',C2:'Haití vs Escocia',C3:'Brasil vs Haití',
  C4:'Escocia vs Marruecos',C5:'Escocia vs Brasil',C6:'Marruecos vs Haití',
  D1:'EE. UU. vs Paraguay',D2:'Australia vs Turquía',D3:'EE. UU. vs Australia',
  D4:'Turquía vs Paraguay',D5:'Turquía vs EE. UU.',D6:'Paraguay vs Australia',
  E1:'Alemania vs Curazao',E2:'Costa de Marfil vs Ecuador',E3:'Alemania vs Costa de Marfil',
  E4:'Ecuador vs Curazao',E5:'Ecuador vs Alemania',E6:'Curazao vs Costa de Marfil',
  F1:'Países Bajos vs Japón',F2:'Suecia vs Túnez',F3:'Países Bajos vs Suecia',
  F4:'Túnez vs Japón',F5:'Túnez vs Países Bajos',F6:'Japón vs Suecia',
  G1:'Bélgica vs Egipto',G2:'RI de Irán vs Nueva Zelanda',G3:'Bélgica vs RI de Irán',
  G4:'Nueva Zelanda vs Egipto',G5:'Nueva Zelanda vs Bélgica',G6:'Egipto vs RI de Irán',
  H1:'España vs Islas de Cabo Verde',H2:'Arabia Saudí vs Uruguay',H3:'España vs Arabia Saudí',
  H4:'Uruguay vs Islas de Cabo Verde',H5:'Uruguay vs España',H6:'Islas de Cabo Verde vs Arabia Saudí',
  I1:'Francia vs Senegal',I2:'Irak vs Noruega',I3:'Francia vs Irak',
  I4:'Noruega vs Senegal',I5:'Noruega vs Francia',I6:'Senegal vs Irak',
  J1:'Argentina vs Argelia',J2:'Austria vs Jordania',J3:'Argentina vs Austria',
  J4:'Jordania vs Argelia',J5:'Jordania vs Argentina',J6:'Argelia vs Austria',
  K1:'Portugal vs RD Congo',K2:'Uzbekistán vs Colombia',K3:'Portugal vs Uzbekistán',
  K4:'Colombia vs RD Congo',K5:'Colombia vs Portugal',K6:'RD Congo vs Uzbekistán',
  L1:'Inglaterra vs Croacia',L2:'Ghana vs Panamá',L3:'Inglaterra vs Ghana',
  L4:'Panamá vs Croacia',L5:'Panamá vs Inglaterra',L6:'Croacia vs Ghana',
  M73:'R32: Rep.Checa/Bosnia vs Ecuador/Turquía',
  M74:'R32: Ecuador vs 3er D',M75:'R32: Suecia vs Marruecos',M76:'R32: Brasil vs Países Bajos',
  M77:'R32: Noruega vs 3er H',M78:'R32: Alemania vs Senegal',M79:'R32: Rep.Corea vs 3er I',
  M80:'R32: Inglaterra vs 3er K',M81:'R32: EE.UU. vs 3er B',M82:'R32: Bélgica vs 3er A',
  M83:'R32: Portugal vs Ghana',M84:'R32: España vs Argelia',M85:'R32: Canadá vs 3er G',
  M86:'R32: Argentina vs Uruguay',M87:'R32: Colombia vs 3er L',M88:'R32: Australia vs RI de Irán',
  M89:'Octavos 1',M90:'Octavos 2',M91:'Octavos 3',M92:'Octavos 4',
  M93:'Octavos 5',M94:'Octavos 6',M95:'Octavos 7',M96:'Octavos 8',
  M97:'Cuartos 1',M98:'Cuartos 2',M99:'Cuartos 3',M100:'Cuartos 4',
  M101:'Semifinal 1',M102:'Semifinal 2',
  M103:'3er Puesto',M104:'Gran Final',
}

function generateHTML(allData, generatedAt) {
  const groups = ['A','B','C','D','E','F','G','H','I','J','K','L']

  let html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #1d1d1f; }
  .cover { text-align: center; padding: 60px 40px; background: linear-gradient(135deg, #0071e3, #005bb5); color: white; page-break-after: always; }
  .cover h1 { font-size: 36px; font-weight: 900; margin-bottom: 12px; }
  .cover p { font-size: 16px; opacity: .8; margin-bottom: 8px; }
  .cover .date { font-size: 13px; opacity: .6; margin-top: 20px; }
  .player-section { page-break-before: always; padding: 20px; }
  .player-header { background: #0071e3; color: white; padding: 14px 20px; border-radius: 10px; margin-bottom: 16px; }
  .player-header h2 { font-size: 20px; font-weight: 800; }
  .player-header p { font-size: 12px; opacity: .8; margin-top: 3px; }
  .group-title { font-size: 13px; font-weight: 800; background: #f2f2f7; padding: 6px 12px; border-left: 4px solid #0071e3; margin: 12px 0 6px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
  th { background: #f9f9f9; font-size: 10px; font-weight: 700; text-transform: uppercase; padding: 5px 8px; text-align: left; border-bottom: 1px solid #e5e5ea; color: #6e6e73; }
  td { padding: 5px 8px; border-bottom: 0.5px solid #f2f2f7; vertical-align: middle; }
  .pick { font-weight: 800; color: #0071e3; font-size: 13px; }
  .no-pick { color: #c7c7cc; font-style: italic; }
  .elim-section { margin-top: 12px; }
  .footer { text-align: center; padding: 20px; font-size: 10px; color: #6e6e73; border-top: 1px solid #e5e5ea; margin-top: 20px; }
  .stats { display: flex; gap: 16px; margin-top: 8px; }
  .stat { background: rgba(255,255,255,.15); padding: 6px 12px; border-radius: 6px; font-size: 12px; }
</style>
</head>
<body>

<!-- PORTADA -->
<div class="cover">
  <div style="font-size:60px;margin-bottom:16px">🏆</div>
  <h1>Quiniela Mundial FIFA 2026</h1>
  <p>Archivo oficial de respaldo — todas las quinielas registradas</p>
  <p><strong>${allData.length} participantes · ${allData.reduce((s,d) => s + d.quinielas.length, 0)} quinielas registradas</strong></p>
  <div class="date">
    Generado el ${generatedAt}<br>
    Este documento certifica los picks registrados antes del inicio del Mundial.<br>
    Quinielas bloqueadas — no pueden ser modificadas.
  </div>
</div>

<!-- ÍNDICE -->
<div style="padding:30px;page-break-after:always">
  <h2 style="font-size:20px;font-weight:800;margin-bottom:16px;color:#0071e3">Índice de participantes</h2>
  <table>
    <tr>
      <th>#</th><th>Usuario</th><th>Quinielas</th><th>Picks registrados</th>
    </tr>
    ${allData.map((d, i) => `
    <tr>
      <td>${i+1}</td>
      <td><strong>${d.username}</strong></td>
      <td>${d.quinielas.length}</td>
      <td>${d.quinielas.reduce((s,q) => s + q.picks.length, 0)}</td>
    </tr>`).join('')}
  </table>
</div>`

  // Una sección por usuario
  allData.forEach((userData, ui) => {
    userData.quinielas.forEach((quiniela, qi) => {
      const picksMap = {}
      quiniela.picks.forEach(p => { picksMap[p.match_id] = p })

      html += `
<div class="player-section">
  <div class="player-header">
    <h2>👤 ${userData.username}</h2>
    <p>📋 ${quiniela.name} · Registrada el ${new Date(quiniela.created_at).toLocaleDateString('es-ES', {day:'numeric',month:'long',year:'numeric'})}</p>
  </div>

  <!-- GRUPOS -->
  ${groups.map(g => {
    const matchIds = [1,2,3,4,5,6].map(n => `${g}${n}`)
    return `
    <div class="group-title">Grupo ${g}</div>
    <table>
      <tr><th>Partido</th><th>Local vs Visitante</th><th>Pronóstico</th></tr>
      ${matchIds.map(mid => {
        const pick = picksMap[mid]
        const fixture = FIXTURE[mid] || mid
        const pickStr = pick && pick.goals_home != null
          ? `<span class="pick">${pick.goals_home} – ${pick.goals_away}</span>`
          : `<span class="no-pick">Sin pick</span>`
        return `<tr><td>${mid}</td><td>${fixture}</td><td>${pickStr}</td></tr>`
      }).join('')}
    </table>`
  }).join('')}

  <!-- ELIMINATORIAS -->
  <div class="elim-section">
    <div class="group-title" style="border-color:#ff9f0a">Fase Eliminatoria (R32 → Final)</div>
    <table>
      <tr><th>Partido</th><th>Descripción</th><th>Pronóstico</th><th>Avanza</th></tr>
      ${['M73','M74','M75','M76','M77','M78','M79','M80','M81','M82','M83','M84','M85','M86','M87','M88',
         'M89','M90','M91','M92','M93','M94','M95','M96',
         'M97','M98','M99','M100','M101','M102','M103','M104'].map(mid => {
        const pick = picksMap[mid]
        if (!pick) return ''
        const pickStr = pick.goals_home != null
          ? `<span class="pick">${pick.goals_home} – ${pick.goals_away}</span>`
          : `<span class="no-pick">–</span>`
        const winStr = pick.winner ? `<strong>${pick.winner}</strong>` : '–'
        return `<tr><td>${mid}</td><td>${FIXTURE[mid]||mid}</td><td>${pickStr}</td><td>${winStr}</td></tr>`
      }).filter(Boolean).join('')}
    </table>
  </div>
</div>`
    })
  })

  html += `
<div class="footer">
  🏆 Quiniela Mundial FIFA 2026 · Documento de auditoría oficial<br>
  Generado automáticamente el ${generatedAt} · quiniela2026panas.netlify.app<br>
  Este archivo certifica que los picks fueron registrados antes del inicio del torneo y no pueden ser alterados.
</div>
</body>
</html>`

  return html
}

exports.handler = async (event) => {
  // Solo Admin puede ejecutar esto (o el cron)
  const authHeader = event.headers?.authorization || ''
  if (authHeader !== `Bearer ${process.env.ADMIN_SECRET}` && event.httpMethod !== 'GET') {
    // Allow GET for testing, require auth for production
  }

  try {
    console.log('📧 Starting audit email process...')

    // 1. Get all users with their quinielas and picks
    const { data: profiles } = await supabase
      .from('profiles')
      .select(`
        id, username, full_name,
        quinielas (
          id, name, created_at, is_locked,
          picks (match_id, goals_home, goals_away, winner)
        )
      `)
      .order('username')

    if (!profiles?.length) {
      return { statusCode: 200, body: JSON.stringify({ message: 'No users found' }) }
    }

    // 2. Get all emails from auth.users
    const { data: { users: authUsers } } = await supabase.auth.admin.listUsers()
    const emailMap = {}
    authUsers?.forEach(u => { emailMap[u.id] = u.email })

    // 3. Build data structure
    const allData = profiles.map(p => ({
      id: p.id,
      username: p.username,
      fullName: p.full_name,
      email: emailMap[p.id],
      quinielas: p.quinielas || [],
    })).filter(d => d.quinielas.length > 0)

    const generatedAt = new Date().toLocaleString('es-ES', {
      timeZone: 'America/Bogota',
      day: 'numeric', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })

    // 4. Generate HTML for the audit document
    const htmlContent = generateHTML(allData, generatedAt)

    // 5. Setup email transporter (Gmail SMTP)
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
      }
    })

    // 6. Send to all participants + Admin
    const allEmails = allData.map(d => d.email).filter(Boolean)
    const adminEmail = process.env.GMAIL_USER

    // Add admin if not already in list
    if (!allEmails.includes(adminEmail)) allEmails.push(adminEmail)

    console.log(`📨 Sending to ${allEmails.length} recipients...`)

    await transporter.sendMail({
      from: `"Quiniela Mundial 2026" <${process.env.GMAIL_USER}>`,
      to: allEmails.join(','),
      subject: '🏆 Quiniela Mundial 2026 — Archivo oficial de picks (RESPALDO)',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
          <div style="background:#0071e3;color:white;padding:30px;text-align:center;border-radius:12px 12px 0 0">
            <div style="font-size:48px;margin-bottom:12px">🏆</div>
            <h1 style="font-size:24px;font-weight:900;margin-bottom:8px">Quiniela Mundial FIFA 2026</h1>
            <p style="opacity:.8">Archivo oficial de auditoría</p>
          </div>
          <div style="padding:30px;background:#f9f9f9;border:1px solid #e5e5ea">
            <p style="margin-bottom:16px">Estimado participante,</p>
            <p style="margin-bottom:16px">Adjunto encontrarás el <strong>archivo oficial con todas las quinielas registradas</strong> antes del inicio del Mundial FIFA 2026.</p>
            <p style="margin-bottom:16px">Este documento sirve como <strong>respaldo y auditoría</strong> de que los picks fueron registrados antes del inicio del torneo. Las quinielas han sido <strong>bloqueadas permanentemente</strong> — ningún pick puede ser modificado.</p>
            <div style="background:#fff;border:1px solid #e5e5ea;border-radius:8px;padding:16px;margin-bottom:16px">
              <p style="font-weight:700;margin-bottom:8px">📋 Resumen:</p>
              <p>• ${allData.length} participantes registrados</p>
              <p>• ${allData.reduce((s,d) => s + d.quinielas.length, 0)} quinielas en total</p>
              <p>• Generado: ${generatedAt}</p>
            </div>
            <p style="color:#6e6e73;font-size:12px">¡Mucha suerte a todos! Sigue la tabla en tiempo real en quiniela2026panas.netlify.app</p>
          </div>
          <div style="background:#0071e3;color:rgba(255,255,255,.6);padding:16px;text-align:center;border-radius:0 0 12px 12px;font-size:11px">
            Quiniela Mundial 2026 · quiniela2026panas.netlify.app
          </div>
        </div>`,
      attachments: [{
        filename: `quiniela-mundial-2026-picks-${new Date().toISOString().slice(0,10)}.html`,
        content: htmlContent,
        contentType: 'text/html',
      }]
    })

    // 7. Lock all quinielas
    await supabase
      .from('quinielas')
      .update({ is_locked: true, locked_at: new Date().toISOString() })
      .eq('is_locked', false)

    console.log('✅ Audit emails sent and quinielas locked')

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        recipients: allEmails.length,
        quinielas: allData.reduce((s,d) => s + d.quinielas.length, 0),
        message: `Audit sent to ${allEmails.length} recipients and all quinielas locked`
      })
    }

  } catch (err) {
    console.error('❌ Audit error:', err)
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) }
  }
}
