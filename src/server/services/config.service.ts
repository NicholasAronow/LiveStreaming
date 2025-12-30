import StreamConfig from '../../shared/model/StreamConfig';

/**
 * Fetches all stream configurations for a user
 * @param userId The user ID
 * @returns Array of stream configurations
 */
export async function getStreamConfigs(userId: string) {
  return await StreamConfig.find({ userId }).sort({ updatedAt: -1 });
}

/**
 * Saves or updates a stream configuration
 * @param userId The user ID
 * @param configData The configuration data
 * @returns The saved configuration
 */
export async function saveStreamConfig(userId: string, configData: any) {
  const { platform, streamKey, rtmpUrl, platformName, platformLogoIcon, maskedStreamKey, createdAt } = configData;

  if (!platform || !streamKey || !platformName || !platformLogoIcon || !maskedStreamKey) {
    throw new Error('Missing required fields');
  }

  // Upsert: update if exists, create if not (based on userId + platform)
  const config = await StreamConfig.findOneAndUpdate(
    { userId, platform },
    {
      userId,
      streamKey,
      rtmpUrl: rtmpUrl || '',
      platform,
      platformName,
      platformLogoIcon,
      maskedStreamKey,
      createdAt: createdAt || new Date().toLocaleString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        month: 'numeric',
        day: 'numeric',
        year: 'numeric'
      }),
      updatedAt: new Date()
    },
    { upsert: true, new: true }
  );

  return config;
}

/**
 * Deletes a stream configuration
 * @param userId The user ID
 * @param platform The platform to delete
 */
export async function deleteStreamConfig(userId: string, platform: string) {
  await StreamConfig.findOneAndDelete({ userId, platform });
}
