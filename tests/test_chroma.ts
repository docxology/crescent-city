import { ChromaClient, PersistentClient, type Collection } from "chromadb";

async function test() {
  try {
    const client = new PersistentClient({ path: "./chroma_data" });
    console.log("Client created");
    const collections = await client.listCollections();
    console.log("Collections:", collections);
    const collection = await client.getOrCreateCollection({
      name: "test",
      metadata: { "hnsw:space": "cosine" }
    });
    console.log("Collection created or retrieved:", collection);
    await collection.add({
      ids: ["1"],
      embeddings: [[0.1, 0.2, 0.3]],
      documents: ["test document"],
      metadatas: [{ source: "test" }]
    });
    console.log("Added document");
    const results = await collection.query({
      queryEmbeddings: [[0.1, 0.2, 0.3]],
      nResults: 1
    });
    console.log("Query results:", results);
  } catch (e) {
    console.error("Error:", e);
  }
}

test();