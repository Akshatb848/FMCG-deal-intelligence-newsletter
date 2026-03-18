#!/usr/bin/env python3
"""
Deal Intelligence Platform — Entry point.

Railway / production: reads $PORT env var automatically.
Local dev:  python main.py            → http://localhost:8000
CLI mode:   python main.py --data file.csv --output out/
"""

import os
import argparse

# ── Expose app at module level so `uvicorn main:app` also works ──────────────
from app.server import app  # noqa: F401  (used by uvicorn main:app)


def cli_run(data_path, output_dir, domain):
    from pipeline.config import DEFAULT_FMCG_CONFIG, PipelineConfig
    from pipeline.runner import run_pipeline

    config = PipelineConfig(domain_name=domain) if (domain and domain.lower() != "fmcg") else DEFAULT_FMCG_CONFIG
    result  = run_pipeline(data_path=data_path, output_dir=output_dir, config=config)
    summary = result["summary"]

    print("=" * 60)
    print(f"  {config.domain_name} — Pipeline Complete")
    print("=" * 60)
    print(f"  {summary['total_input']} input → {summary['final_count']} final records")
    print("\n  Output files:")
    for fmt, path in result["output_paths"].items():
        print(f"    [{fmt.upper()}]  {path}")
    print("\n  Category breakdown:")
    for cat, cnt in sorted(summary["type_breakdown"].items(), key=lambda x: -x[1]):
        print(f"    {cnt:3d}  {cat}")


def serve(host: str = "0.0.0.0", port: int | None = None):
    import uvicorn
    # Railway injects $PORT — always prefer it over the default
    port = port or int(os.environ.get("PORT", 8000))
    print(f"\n  Deal Intelligence Platform  →  http://{host}:{port}\n")
    uvicorn.run("app.server:app", host=host, port=port, reload=False)


def main():
    parser = argparse.ArgumentParser(description="Deal Intelligence Platform")
    subparsers = parser.add_subparsers(dest="command")

    serve_p = subparsers.add_parser("serve", help="Start the web server")
    serve_p.add_argument("--host", default="0.0.0.0")
    serve_p.add_argument("--port", type=int, default=None)

    parser.add_argument("--data",   "-d", default=None)
    parser.add_argument("--output", "-o", default="output")
    parser.add_argument("--domain", default="FMCG")

    args = parser.parse_args()

    if args.command == "serve":
        serve(args.host, args.port)
    elif args.data:
        cli_run(args.data, args.output, args.domain)
    else:
        serve()  # default: start web server, reads $PORT from env


if __name__ == "__main__":
    main()
