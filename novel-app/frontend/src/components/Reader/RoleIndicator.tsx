/**
 * Role Indicator Component - Shows role and voice badge for paragraph
 * Component Chỉ báo Vai diễn - Hiển thị badge vai diễn và giọng nói cho paragraph
 */
import { User, Users, BookOpen, Mic } from 'lucide-react'
import { useVoiceResolver } from '../../hooks/useVoiceResolver'

interface RoleIndicatorProps {
  role?: string | null
  voiceId?: string | null  // Legacy voiceId (may be from different model, will be ignored if role exists)
  novelId?: string | null  // Novel ID for novel-specific voice mapping
  model?: string | null    // TTS model name (e.g., 'coqui-xtts-v2')
  compact?: boolean
}

function RoleIndicator({ role, voiceId, novelId, model, compact = false }: RoleIndicatorProps): JSX.Element | null {
  // Resolve voice using enhanced voice mapping if role exists
  // Giải quyết giọng sử dụng enhanced voice mapping nếu vai diễn tồn tại
  const { voice: resolvedVoice, isLoading: isLoadingVoice } = useVoiceResolver(role, { novelId, model })
  
  // Use resolved voice if available, otherwise fall back to voiceId (for backward compatibility)
  // Sử dụng giọng đã giải quyết nếu có, nếu không dùng voiceId (để tương thích ngược)
  const displayVoice = resolvedVoice || (role ? null : voiceId)  // Only use voiceId if no role
  
  if (!role && !displayVoice) {
    return null
  }

  // Role colors and icons (support enhanced roles: narrator, male_1, male_2, female_1, etc.)
  // Màu và biểu tượng vai diễn (hỗ trợ vai diễn nâng cao: narrator, male_1, male_2, female_1, etc.)
  const getRoleConfig = (role: string | null | undefined) => {
    if (!role) return null
    
    const roleLower = role.toLowerCase()
    
    // Narrator
    if (roleLower === 'narrator') {
      return {
        label: 'Narrator',
        color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border-purple-300 dark:border-purple-700',
        icon: BookOpen,
      }
    }
    
    // Male roles (male, male_1, male_2, etc.)
    if (roleLower.startsWith('male')) {
      const match = roleLower.match(/male(?:_(\d+))?/)
      const number = match?.[1] ? ` ${match[1]}` : ''
      return {
        label: `Male${number}`,
        color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-300 dark:border-blue-700',
        icon: User,
      }
    }
    
    // Female roles (female, female_1, female_2, etc.)
    if (roleLower.startsWith('female')) {
      const match = roleLower.match(/female(?:_(\d+))?/)
      const number = match?.[1] ? ` ${match[1]}` : ''
      return {
        label: `Female${number}`,
        color: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300 border-pink-300 dark:border-pink-700',
        icon: Users,
      }
    }
    
    // Unknown role - use default
    return {
      label: role,
      color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300 border-gray-300 dark:border-gray-700',
      icon: Mic,
    }
  }

  const config = getRoleConfig(role)

  if (compact) {
    // Compact badge (icon only)
    const Icon = config?.icon || Mic
    return (
      <div className="flex flex-col items-center space-y-1">
        {config && (
          <span
            className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${config.color} text-xs border`}
            title={`${config.label}${displayVoice ? ` - ${displayVoice}` : ''}${isLoadingVoice ? ' (loading...)' : ''}`}
          >
            <Icon className="w-3 h-3" />
          </span>
        )}
        {displayVoice && (
          <span
            className="text-[10px] text-gray-600 dark:text-gray-400 font-mono max-w-[60px] truncate"
            title={displayVoice}
          >
            {displayVoice}
          </span>
        )}
        {isLoadingVoice && !displayVoice && (
          <span className="text-[10px] text-gray-400 dark:text-gray-500">...</span>
        )}
      </div>
    )
  }

  // Full badge with label and voice
  return (
    <div className="flex flex-col items-start space-y-1 min-w-[80px]">
      {config && (
        <span
          className={`inline-flex items-center space-x-1 px-2 py-1 rounded-md text-xs font-medium ${config.color} border`}
        >
          <config.icon className="w-3 h-3" />
          <span>{config.label}</span>
        </span>
      )}
      {displayVoice && (
        <span
          className="inline-flex items-center space-x-1 px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 font-mono"
          title={`Voice: ${displayVoice}${isLoadingVoice ? ' (loading...)' : ''}`}
        >
          <Mic className="w-3 h-3" />
          <span className="max-w-[120px] truncate">{displayVoice}</span>
        </span>
      )}
      {isLoadingVoice && !displayVoice && (
        <span className="inline-flex items-center space-x-1 px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600">
          <Mic className="w-3 h-3 animate-pulse" />
          <span className="text-gray-400">Loading...</span>
        </span>
      )}
    </div>
  )
}

export default RoleIndicator

