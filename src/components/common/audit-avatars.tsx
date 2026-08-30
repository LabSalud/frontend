import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { formatUtcDateTime } from "@/lib/format-utils"

interface AuditInfo {
  user: {
    username: string
    photo: string | null
  } | null
  date: string
}

interface AuditAvatarsProps {
  creation?: AuditInfo | null
  lastChange?: AuditInfo | null
  size?: "sm" | "md" | "lg"
  className?: string
}

const sizeClasses = {
  sm: "h-6 w-6",
  md: "h-8 w-8",
  lg: "h-10 w-10",
}

const textSizeClasses = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
}

const formatDateTime = (dateString: string) => formatUtcDateTime(dateString)

export function AuditAvatars({ creation, lastChange, size = "md", className = "" }: AuditAvatarsProps) {
  const sizeClass = sizeClasses[size]
  const textSizeClass = textSizeClasses[size]

  if (!creation?.user && !lastChange?.user) {
    return null
  }

  return (
    <TooltipProvider>
      <div className={`flex items-center gap-1 sm:gap-2 flex-wrap ${className}`}>
        {/* Avatar de Creación */}
        {creation?.user && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Avatar className={`${sizeClass} border-2 border-green-500 cursor-help`}>
                <AvatarImage src={creation.user.photo || undefined} alt={creation.user.username} />
                <AvatarFallback className="bg-green-100 text-green-700">
                  {creation.user.username.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent className="max-w-[250px] sm:max-w-none">
              <div className="space-y-1">
                <p className={textSizeClass}>
                  <strong>Creado por:</strong> {creation.user.username}
                </p>
                <p className={`${textSizeClass} text-gray-400`}>{formatDateTime(creation.date)}</p>
              </div>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Avatar de Última Modificación */}
        {lastChange?.user && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Avatar className={`${sizeClass} border-2 border-blue-500 cursor-help`}>
                <AvatarImage src={lastChange.user.photo || undefined} alt={lastChange.user.username} />
                <AvatarFallback className="bg-blue-100 text-blue-700">
                  {lastChange.user.username.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent className="max-w-[250px] sm:max-w-none">
              <div className="space-y-1">
                <p className={textSizeClass}>
                  <strong>Modificado por:</strong> {lastChange.user.username}
                </p>
                <p className={`${textSizeClass} text-gray-400`}>{formatDateTime(lastChange.date)}</p>
              </div>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  )
}
