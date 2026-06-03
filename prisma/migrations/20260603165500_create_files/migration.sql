CREATE TABLE "files" (
    "link_id" VARCHAR(32) NOT NULL,
    "original_filename" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "size_bytes" BIGINT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "files_pkey" PRIMARY KEY ("link_id")
);

CREATE UNIQUE INDEX "files_storage_key_key" ON "files"("storage_key");
