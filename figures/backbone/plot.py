"""Render standalone figures from benchmark.py's saved outputs.

python -m pip install numpy matplotlib
python plot.py
"""
from pathlib import Path
import json

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np

HERE = Path(__file__).resolve().parent
DATA = json.loads((HERE / 'results.json').read_text(encoding='utf8'))
COLORS = {'narrow': '#2868ac', 'nonlinear': '#ac7a30', 'expanded': '#737594'}
LABELS = {'narrow': 'Linear head', 'nonlinear': 'Polynomial head', 'expanded': 'Expanded features'}
STYLES = {'narrow': '--', 'nonlinear': '-.', 'expanded': '-'}
plt.rcParams.update({'font.family': 'DejaVu Sans', 'font.size': 11,
                     'axes.spines.top': False, 'axes.spines.right': False,
                     'axes.edgecolor': '#9aa7b1', 'axes.labelcolor': '#415468',
                     'xtick.color': '#576876', 'ytick.color': '#576876',
                     'text.color': '#334b60', 'svg.fonttype': 'path',
                     'svg.hashsalt': 'backbone-2026-11-22'})


def style(ax):
    ax.set_facecolor('none')
    ax.grid(axis='y', color='#9ba9b5', alpha=.2, linewidth=.7)
    ax.set_axisbelow(True)


def learning(ax, scenario, bands):
    for kind, model in DATA['scenarios'][scenario]['models'].items():
        n = [row['n'] for row in model['learning']]
        median = [row['median'] for row in model['learning']]
        if bands:
            ax.fill_between(n, [row['q10'] for row in model['learning']],
                            [row['q90'] for row in model['learning']],
                            color=COLORS[kind], alpha=.1, linewidth=0)
        ax.plot(n, median, STYLES[kind], color=COLORS[kind], linewidth=2, marker='o',
                markersize=4, label=LABELS[kind])
    ax.set_xscale('log', base=2)
    ax.set_xticks(DATA['sizes'], labels=DATA['sizes'])
    ax.set_xlabel('Simulated measurements')
    ax.set_ylabel('Median RMSE [W/(m K)]')
    style(ax)


fig, axes = plt.subplots(1, 2, figsize=(10, 4.7), layout='constrained')
fig.patch.set_alpha(0)
x = np.asarray(DATA['x']) * 100
truth = DATA['scenarios']['contact']['truth']
axes[0].plot(x, truth, color='#253a4a', linewidth=2.3, label='Target')
for kind, model in DATA['scenarios']['contact']['models'].items():
    curve = next(row for row in model['curves'] if row['n'] == 24)
    axes[0].plot(x, curve['prediction'], STYLES[kind], color=COLORS[kind], linewidth=1.8,
                 label=LABELS[kind])
axes[0].set_xlabel('Compression [%]')
axes[0].set_ylabel(r'$\lambda_{\mathrm{eff}}$ [W/(m K)]')
axes[0].set_title('24 measurements · first seed', loc='left', fontsize=12, pad=14)
style(axes[0])
learning(axes[1], 'contact', False)
axes[1].set_title('Median over 100 repeats', loc='left', fontsize=12, pad=14)
fig.savefig(HERE / 'contact-fit.svg', metadata={'Date': None, 'Description': 'Saved benchmark fits, not a neural-network training run.'})
plt.close(fig)

fig, axes = plt.subplots(1, 2, figsize=(10, 4.7), layout='constrained')
fig.patch.set_alpha(0)
for ax, scenario, title in zip(axes, ['rescale', 'contact'], ['Rescale an existing feature', 'Contact-driven U-shape']):
    learning(ax, scenario, True)
    ax.set_title(title, loc='left', fontsize=12, pad=14)
axes[1].legend(frameon=False, fontsize=10)
fig.savefig(HERE / 'learning-curves.svg', metadata={'Date': None, 'Description': 'Median and 10th–90th percentile RMSE across 100 paired noise realizations.'})
plt.close(fig)
print('Rendered contact-fit.svg and learning-curves.svg')
