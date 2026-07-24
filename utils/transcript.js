const discordTranscripts = require('discord-html-transcripts');
const { EmbedBuilder } = require('discord.js');
const { dbAsync } = require('../dashboard/database/db');

/**
 * Generates an HTML transcript and sends it to the configured logs channel & stores in SQLite DB
 * @param {TextChannel} channel - The ticket channel
 * @param {TextChannel} logsChannel - The logs channel to send to
 * @param {User} staffMember - The staff member who initiated the action
 * @param {Object} config - The bot config object
 */
async function generateAndSend(channel, logsChannel, staffMember, config) {
  // Generate HTML transcript string & attachment
  const htmlBuffer = await discordTranscripts.createTranscript(channel, {
    limit: -1,
    fileName: `transcript-${channel.name}.html`,
    returnType: 'buffer',
    poweredBy: false
  });

  const attachment = await discordTranscripts.createTranscript(channel, {
    limit: -1,
    fileName: `transcript-${channel.name}.html`,
    returnType: 'attachment',
    poweredBy: false
  });

  const htmlContent = htmlBuffer.toString('utf8');
  const txtContent = htmlContent.replace(/<[^>]+>/g, '');

  // Extract ticket type and creator username from channel name
  const nameParts = channel.name.split('-');
  const ticketTypeRaw = nameParts[0];
  const creatorUsername = nameParts[nameParts.length - 1];

  let ticketType = 'Unknown';
  if (ticketTypeRaw === 'complaint') ticketType = 'Complaint';
  else if (ticketTypeRaw === 'suggestion') ticketType = 'Suggestion';
  else if (ticketTypeRaw === 'join') ticketType = 'Request to Join Team';
  else if (ticketTypeRaw === 'closed') {
    const subType = nameParts[1];
    if (subType === 'complaint') ticketType = 'Complaint (Closed)';
    else if (subType === 'suggestion') ticketType = 'Suggestion (Closed)';
    else if (subType === 'join') ticketType = 'Request to Join Team (Closed)';
    else ticketType = 'Closed Ticket';
  }

  // Attempt to find creator in cache
  const creatorMember = channel.guild.members.cache.find(
    m => m.user.username.toLowerCase() === creatorUsername.toLowerCase()
  );
  const creatorValue = creatorMember ? `${creatorMember.user} (${creatorMember.user.tag})` : `@${creatorUsername}`;
  const creatorTag = creatorMember ? creatorMember.user.tag : creatorUsername;

  // Save to SQLite Database
  dbAsync.run(`
    INSERT INTO transcripts (ticket_name, type, creator_tag, staff_tag, file_name, content_html, content_txt)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [
    channel.name,
    ticketType,
    creatorTag,
    staffMember.tag,
    `transcript-${channel.name}.html`,
    htmlContent,
    txtContent
  ]).catch(err => {
    console.error('[DB Transcript Save Error]', err);
  });

  const embed = new EmbedBuilder()
    .setTitle('📄 Transcript Saved')
    .setColor(config.embedColors?.primary || '#5865F2')
    .addFields(
      { name: 'Ticket Name', value: `\`${channel.name}\``, inline: true },
      { name: 'Ticket Type', value: ticketType, inline: true },
      { name: 'User / Creator', value: creatorValue, inline: true },
      { name: 'Staff Member', value: `${staffMember} (${staffMember.tag})`, inline: true },
      { name: 'Time', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
    )
    .setTimestamp()
    .setFooter({ text: config.footerText || 'OTC Ticket Bot' });

  await logsChannel.send({
    embeds: [embed],
    files: [attachment]
  });
}

module.exports = { generateAndSend };
