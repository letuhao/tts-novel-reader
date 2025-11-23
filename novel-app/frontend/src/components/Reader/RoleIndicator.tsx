/**
 * Role Indicator Component - Shows role and voice badge for paragraph
 * Component Chỉ báo Vai diễn - Hiển thị badge vai diễn và giọng nói cho paragraph
 */
import { User, Users, BookOpen, Mic } from 'lucide-react'

interface RoleIndicatorProps {
  role?: string | null
  voiceId?: string | null
  compact?: boolean
}

function RoleIndicator({ role, voiceId, compact = false }: RoleIndicatorProps): JSX.Element | null {
  if (!role && !voiceId) {
    return null
  }

  // Role colors and icons
  const roleConfig: Record<string, { label: string; color: string; icon: typeof User }> = {
    narrator: {
      label: 'Narrator',
      color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border-purple-300 dark:border-purple-700',
      icon: BookOpen,
    },
    male: {
      label: 'Male',
      color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-300 dark:border-blue-700',
      icon: User,
    },
    female: {
      label: 'Female',
      color: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300 border-pink-300 dark:border-pink-700',
      icon: Users,
    },
  }

  const config = role ? roleConfig[role.toLowerCase()] : null

  if (compact) {
    // Compact badge (icon only)
    const Icon = config?.icon || Mic
    return (
      <div className="flex flex-col items-center space-y-1">
        {config && (
          <span
            className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${config.color} text-xs border`}
            title={`${config.label}${voiceId ? ` - ${voiceId}` : ''}`}
          >
            <Icon className="w-3 h-3" />
          </span>
        )}
        {voiceId && (
          <span
            className="text-[10px] text-gray-600 dark:text-gray-400 font-mono max-w-[60px] truncate"
            title={voiceId}
          >
            {voiceId}
          </span>
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
      {voiceId && (
        <span
          className="inline-flex items-center space-x-1 px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 font-mono"
          title={`Voice Model: ${voiceId}`}
        >
          <Mic className="w-3 h-3" />
          <span className="max-w-[120px] truncate">{voiceId}</span>
        </span>
      )}
    </div>
  )
}

export default RoleIndicator

