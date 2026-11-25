import { useParams } from "react-router-dom";
import DataView from "../../components/common/DataView";
import PageHeader from "../../components/common/PageHeader";
import { sessionService } from "../../services/sessionService";

export default function TicketGeneration() {
  const { sessionId } = useParams();
  return (
    <div>
      <PageHeader eyebrow="Route ticket" title="Tour ticket" />
      {sessionId ? (
        <DataView
          loader={() => sessionService.get(sessionId)}
          emptyTitle="Ticket unavailable"
          emptyMessage="The session ticket could not be retrieved."
          render={(data) => (
            <div className="card card-body">
              <p><strong>Session:</strong> {data?.id || sessionId}</p>
              {data?.qrCodeUrl && <img src={data.qrCodeUrl} alt="Tour route QR code" style={{ maxWidth: 280, width: "100%" }} />}
              {data?.token && <p><strong>Session code:</strong> {data.token}</p>}
            </div>
          )}
        />
      ) : <div className="state state-empty"><h2>Session unavailable</h2></div>}
    </div>
  );
}