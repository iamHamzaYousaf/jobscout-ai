"""Local sentence embeddings and ChromaDB storage for CV RAG."""

from __future__ import annotations

from typing import TYPE_CHECKING

from sentence_transformers import SentenceTransformer

if TYPE_CHECKING:
    import chromadb
    from chromadb.api.models.Collection import Collection

_model: SentenceTransformer | None = None


def _get_model() -> SentenceTransformer:
    """Lazy-load the MiniLM encoder (downloaded on first use)."""
    global _model
    if _model is None:
        _model = SentenceTransformer("all-MiniLM-L6-v2")
    return _model


def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> list[str]:
    """Split text into fixed-size chunks with overlap for retrieval."""
    if not text:
        return []
    chunks: list[str] = []
    start = 0
    n = len(text)
    while start < n:
        end = min(start + chunk_size, n)
        chunks.append(text[start:end])
        if end >= n:
            break
        start = end - overlap
        if start < 0:
            start = 0
    return chunks


def embed_and_store(chunks: list[str], session_id: str) -> "Collection":
    """
    Embed chunks with MiniLM, store in an in-memory Chroma collection named ``session_id``.

    Returns the Chroma collection for optional follow-up queries in the same process.
    """
    import chromadb

    model = _get_model()
    try:
        client = chromadb.EphemeralClient()
    except AttributeError:  # pragma: no cover - older chromadb builds
        client = chromadb.Client()
    collection = client.create_collection(name=session_id)

    if not chunks:
        return collection

    embeddings = model.encode(chunks, show_progress_bar=False).tolist()
    ids = [str(i) for i in range(len(chunks))]
    collection.add(ids=ids, documents=chunks, embeddings=embeddings)
    return collection


def retrieve_relevant(query: str, collection: "Collection", top_k: int = 5) -> str:
    """Embed the query, retrieve top-k chunks from the collection, and join them."""
    if not query.strip():
        return ""

    count = collection.count()
    if count == 0:
        return ""

    model = _get_model()
    query_embedding = model.encode([query], show_progress_bar=False).tolist()
    result = collection.query(
        query_embeddings=query_embedding,
        n_results=min(top_k, count),
    )
    docs = result.get("documents") or [[]]
    flat = docs[0] if docs else []
    return "\n\n".join(flat)
