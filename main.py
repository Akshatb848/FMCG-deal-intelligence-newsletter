#!/usr/bin/env python3
"""
Deal Intelligence Platform — CLI entry point.

Usage
-----
    # Run web server (recommended)
    python main.py serve

    # Run pipeline on a file directly (CLI mode, uses FMCG defaults)
    python main.py --data path/to/file.csv --output my_output/

    # Custom domain pipeline
    python main.py --data articles.csv --domain "Tech M&A" --output out/
"""

import argparse
import sys


def cli_run(data_path, output_dir, domain):
    from pipeline.config import DEFAULT_FMCG_CONFIG, PipelineConfig
    from pipeline.runner import run_pipeline

    if domain and domain.lower() != "fmcg":
        # Use blank config (no domain keywords) so user gets unfiltered output
        config = PipelineConfig(domain_name=domain)
    else:
        config = DEFAULT_FMCG_CONFIG

    result = run_pipeline(data_path=data_path, output_dir=output_dir, config=config)
    summary = result["summary"]

    print("=" * 60)
    print(f"  {config.domain_name} — Pipeline Complete")
    print("=" * 60)
    print(f"  {summary['total_input']} input → {summary['final_count']} final records")
    print()
    print("  Output files:")
    for fmt, path in result["output_paths"].items():
        print(f"    [{fmt.upper()}]  {path}")
    print()
    print("  Category breakdown:")
    for cat, cnt in sorted(summary["type_breakdown"].items(), key=lambda x: -x[1]):
        print(f"    {cnt:3d}  {cat}")


def serve(host, port):
    import uvicorn
    print(f"\n  Deal Intelligence Platform")
    print(f"  → Open http://{host}:{port} in your browser\n")
    uvicorn.run("app.server:app", host=host, port=port, reload=False)


def main():
    parser = argparse.ArgumentParser(
        description="Deal Intelligence Platform",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    subparsers = parser.add_subparsers(dest="command")

    # `serve` subcommand
    serve_p = subparsers.add_parser("serve", help="Start the web server")
    serve_p.add_argument("--host", default="0.0.0.0")
    serve_p.add_argument("--port", type=int, default=8000)

    # CLI pipeline flags (no subcommand = legacy mode)
    parser.add_argument("--data", "-d", default=None)
    parser.add_argument("--output", "-o", default="output")
    parser.add_argument("--domain", default="FMCG")

    args = parser.parse_args()

    if args.command == "serve":
        serve(args.host, args.port)
    elif args.data:
        cli_run(args.data, args.output, args.domain)
    else:
        # Default: start the web server
        serve("0.0.0.0", 8000)


if __name__ == "__main__":
    main()
