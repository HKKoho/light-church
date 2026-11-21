# Postgres 16 (Alpine) + pgvector, for the Theology Library (docs/RAGplan.md).
#
# Deliberately NOT pgvector/pgvector:pg16: that image is Debian (glibc), while
# the existing data volume was initialised on Alpine (musl) with the libc
# `en_US.utf8` collation. glibc sorts text differently, so swapping the base
# would silently invalidate every text index (e.g. the unique User.email).
# Building pgvector into the same Alpine image keeps the volume untouched.
FROM postgres:16-alpine

ARG PGVECTOR_VERSION=v0.8.0

RUN apk add --no-cache --virtual .build-deps git build-base clang19 llvm19 \
  && git clone --branch "${PGVECTOR_VERSION}" --depth 1 https://github.com/pgvector/pgvector.git /tmp/pgvector \
  && cd /tmp/pgvector \
  && make OPTFLAGS="" \
  && make install \
  && cd / \
  && rm -rf /tmp/pgvector \
  && apk del .build-deps
