
// This file contains simplified Lottie animation data for the reaction emojis.

export const likeAnimation = {
  v: '5.5.7',
  fr: 30,
  ip: 0,
  op: 30,
  w: 200,
  h: 200,
  nm: 'Like',
  layers: [
    {
      nm: 'Thumb',
      ty: 4,
      ks: {
        o: { a: 0, k: 100 },
        r: { a: 0, k: 0 },
        p: { a: 0, k: [100, 100, 0] },
        a: { a: 0, k: [100, 100, 0] },
        s: { a: 1, k: [ { t: 0, s: [100, 100, 100] }, { t: 15, s: [120, 120, 120] }, { t: 30, s: [100, 100, 100] } ] },
      },
      shapes: [
        {
          ty: 'gr',
          it: [
            {
              ty: 'el',
              d: 1,
              s: { a: 0, k: [180, 180] },
              p: { a: 0, k: [0, 0] },
            },
            {
              ty: 'fl',
              c: { a: 0, k: [0.2, 0.6, 1, 1] },
            },
          ],
        },
      ],
    },
  ],
};

export const loveAnimation = {
  v: '5.5.7',
  fr: 30,
  ip: 0,
  op: 30,
  w: 200,
  h: 200,
  nm: 'Love',
  layers: [
    {
      nm: 'Heart',
      ty: 4,
      ks: {
        o: { a: 0, k: 100 },
        r: { a: 0, k: 0 },
        p: { a: 0, k: [100, 100, 0] },
        a: { a: 0, k: [100, 100, 0] },
        s: { a: 1, k: [ { t: 0, s: [100, 100, 100] }, { t: 15, s: [120, 120, 120] }, { t: 30, s: [100, 100, 100] } ] },
      },
      shapes: [
        {
          ty: 'gr',
          it: [
            {
              ty: 'sh',
              ks: {
                a: 0,
                k: {
                  i: [[-55.2,0], [0,55.2], [55.2,0], [0,-55.2]],
                  o: [[55.2,0], [0,-55.2], [-55.2,0], [0,55.2]],
                  v: [[0,-100], [-100,0], [0,100], [100,0]],
                  c: true
                },
              },
            },
            {
              ty: 'fl',
              c: { a: 0, k: [1, 0.2, 0.2, 1] },
            },
          ],
        },
      ],
    },
  ],
};
