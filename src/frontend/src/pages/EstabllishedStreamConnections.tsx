import StreamConnectionCard from '../components/StreamConnectionCard'
import { StreamConnection } from '../types'

interface EstablishedStreamConnectionsProps {
  connections: StreamConnection[];
  onOpenConnection: (connection: StreamConnection) => void;
}

function EstabllishedStreamConnections({ connections, onOpenConnection }: EstablishedStreamConnectionsProps) {
  return (
    <div className="w-full h-full overflow-y-auto px-[24px] pt-[24px] pb-[100px] bg-[#FAFAFA]">
      <div className="flex flex-col gap-[16px]">
        {connections.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full pt-[100px]">
            <p className="text-[16px] text-[var(--muted-forground)] text-center">
              No stream connections yet.
              <br />
              Add a platform from the "New" tab.
            </p>
          </div>
        ) : (
          connections.map((connection) => (
            <StreamConnectionCard
              key={connection.id}
              connection={connection}
              onOpen={onOpenConnection}
            />
          ))
        )}
      </div>
    </div>
  )
}

export default EstabllishedStreamConnections