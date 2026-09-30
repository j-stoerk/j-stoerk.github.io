#!/usr/bin/env python3
"""
Small illustrative parameter sweep for zbs-electrode.
Dry graphite coating conductivity vs bridge fraction,
and wet graphite forward/inverse round-trip sanity checks.
"""
import sys
import argparse
import json
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description="ZBS electrode thermal parameter sweep")
    parser.add_argument("--repo", type=str, required=True, help="Path to zbs-electrode repository root")
    args = parser.parse_args()

    repo_src = Path(args.repo) / "src"
    if not repo_src.is_dir():
        raise FileNotFoundError(f"Expected src/ under repository root: {repo_src}")
    sys.path.insert(0, str(repo_src))

    from electrode_thermal import (
        lambda_eff_coating,
        lambda_eff_coating_contact,
        invert_porosity,
        LAMBDA_AIR,
        LAMBDA_ELECTROLYTE,
        LAMBDA_GRAPHITE,
    )
    import jax.numpy as jnp

    # ------------------------------------------------------------------
    # 1) Dry graphite: contact closure with and without bridge
    # ------------------------------------------------------------------
    porosities = [0.25, 0.35, 0.45]
    d_p_dry = 18e-6
    lambda_s_dry = 25.0
    phi_vals = [0.0, 0.01]
    lambda_bridge = 130.0

    dry_results = []
    for psi in porosities:
        row = {"porosity": float(psi), "d_p": d_p_dry, "lambda_s": lambda_s_dry}
        vals = []
        for phi in phi_vals:
            lam = float(
                lambda_eff_coating_contact(
                    psi=psi,
                    d_p=d_p_dry,
                    lambda_s=lambda_s_dry,
                    lambda_f=LAMBDA_AIR,
                    gas_filled=True,
                    phi=phi,
                    lambda_bridge=lambda_bridge,
                )
            )
            assert jnp.isfinite(lam) and lam > 0.0, f"Non-finite/positive lam at psi={psi}, phi={phi}"
            row[f"lambda_phi_{phi}"] = lam
            vals.append(lam)
        ratio = vals[1] / vals[0]
        assert ratio > 1.0, f"Bridge did not increase conductivity at psi={psi}"
        row["ratio_phi0.01_over_phi0"] = ratio
        dry_results.append(row)

    # ------------------------------------------------------------------
    # 2) Wet graphite: forward/inverse round-trip
    # ------------------------------------------------------------------
    d_p_wet = 17e-6
    lambda_s_wet = float(LAMBDA_GRAPHITE)
    lambda_f_wet = float(LAMBDA_ELECTROLYTE)

    wet_results = []
    for psi in porosities:
        lam_fwd = float(
            lambda_eff_coating(
                psi=psi,
                d_p=d_p_wet,
                lambda_s=lambda_s_wet,
                lambda_f=lambda_f_wet,
                gas_filled=False,
            )
        )
        psi_inv = float(
            invert_porosity(
                lambda_meas=lam_fwd,
                d_p=d_p_wet,
                lambda_s=lambda_s_wet,
                lambda_f=lambda_f_wet,
                gas_filled=False,
            )
        )
        err = abs(psi_inv - psi)
        assert err < 1e-8, f"Porosity round-trip error {err} >= 1e-8 at psi={psi}"
        wet_results.append(
            {
                "porosity_target": float(psi),
                "lambda_forward": lam_fwd,
                "porosity_inverted": psi_inv,
                "abs_error": err,
            }
        )

    # ------------------------------------------------------------------
    # 3) Summary JSON
    # ------------------------------------------------------------------
    out = {
        "dry_graphite_contact": dry_results,
        "wet_graphite_roundtrip": wet_results,
    }
    out_dir = Path(__file__).parent
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / "results.json"
    with open(out_path, "w") as fh:
        json.dump(out, fh, indent=2)
    print(json.dumps(out, indent=2))


if __name__ == "__main__":
    main()
