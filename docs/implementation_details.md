# Implementation Details

## Cache File Structure

Files in the cache are named by the following patterns:

```xml
data_<datahash>__<type>_<hash>
```

- Dataset
  - (Optional) cached preprocessed data `data_8e58f9ff3ed997f66193838f38110cd6`
  - Arguments `data_8e58f9ff3ed997f66193838f38110cd6_args.json`
  - Optimal classifier `data_8e58f9ff3ed997f66193838f38110cd6_opt_clf`

- Projected data
  - Data `data_8e58f9ff3ed997f66193838f38110cd6__proj_8fa6dc565e3593b2f9b797fc92d73861`
  - Argments `data_8e58f9ff3ed997f66193838f38110cd6__proj_8fa6dc565e3593b2f9b797fc92d73861_args.json`

- Classifiers
  - Prefixed with their dataset hash
  - Data needed for the frontend
    - `data_8e58f9ff3ed997f66193838f38110cd6__clf_0bc117b521ef19fe7baf21bcbcb5fb39`
    - Contains scores and information on dataset etc.
  - Predictions
    - `data_8e58f9ff3ed997f66193838f38110cd6__clf_0bc117b521ef19fe7baf21bcbcb5fb39_proba`
    - Needed for classifier projections
  - Arguments
    - `data_8e58f9ff3ed997f66193838f38110cd6__clf_0bc117b521ef19fe7baf21bcbcb5fb39_args.json`
    - Displayed in the frontend menu and the cache explorer
  - Scores
    - `data_8e58f9ff3ed997f66193838f38110cd6__clf_0bc117b521ef19fe7baf21bcbcb5fb39_scores.json`
    - Displayed in the frontend menu and the cache explorer

- Classifier projections
  - Data `data_8e58f9ff3ed997f66193838f38110cd6__clf_proj_04f712ea2daddef0ab30c2fcae8fdf26`
  - Arguments `data_8e58f9ff3ed997f66193838f38110cd6__clf_proj_04f712ea2daddef0ab30c2fcae8fdf26_args.json`
