import type {
  ConnectorCatalogResponse,
  ExecuteConnectorRequest,
  ExecuteConnectorResponse,
} from "./connector-types";

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function fetchConnectorCatalog() {
  const response = await fetch("/api/connectors");
  return readJson<ConnectorCatalogResponse>(response);
}

export async function executeConnector(request: ExecuteConnectorRequest) {
  const response = await fetch("/api/connectors/execute", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  return readJson<ExecuteConnectorResponse>(response);
}
