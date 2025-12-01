import StreamConnectionCard from '../components/StreamConnectionCard'
import { StreamConnection } from '../types'

interface EstablishedStreamConnectionsProps {
  connections: StreamConnection[];
  onOpenConnection: (connection: StreamConnection) => void;
  onNavigateToNew?: () => void;
  activeConnectionId?: string | null;
  isStreaming?: boolean;
}

function EstabllishedStreamConnections({ connections, onOpenConnection, onNavigateToNew, activeConnectionId, isStreaming }: EstablishedStreamConnectionsProps) {
  return (
    <div className="w-full h-full overflow-y-auto px-[24px] pt-[24px] pb-[100px] bg-[#FAFAFA]">
      <div className="flex flex-col gap-[24px]">
        {connections.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full pt-[100px] px-[24px]">
            <div className="text-center mb-[32px]">
              <h3 className="text-[20px] font-semibold text-[var(--secondary-background)] mb-[12px]">
                No Saved Streams
              </h3>
              <p className="text-[16px] text-[var(--muted-forground)] leading-relaxed">
                You don't have any preset streams saved yet.
                <br />
                Add a new stream to get started!
              </p>
            </div>

            <button
              onClick={onNavigateToNew}
              className="bg-[#0A0A0A] text-white rounded-[16px] px-[32px] h-[48px] text-[16px] font-medium hover:opacity-90 transition-opacity flex items-center gap-[8px]"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Add New Stream
            </button>
          </div>
        ) : (
          connections.map((connection) => {
            const isThisActive = isStreaming && activeConnectionId === connection.id;
            const shouldGreyOut = isStreaming && !isThisActive;
            return (
              <StreamConnectionCard
                key={connection.id}
                connection={connection}
                onOpen={onOpenConnection}
                isActive={isThisActive}
                isGreyedOut={shouldGreyOut}
              />
            );
          })
        )}
      </div>
    </div>
  )
}

export default EstabllishedStreamConnections