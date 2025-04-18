/*
 * Copyright (c) 2016-present Invertase Limited & Contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this library except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

const COLLECTION = 'firestore';

describe('firestore.doc()', function () {
  describe('v8 compatibility', function () {
    beforeEach(async function beforeEachTest() {
      // @ts-ignore
      globalThis.RNFB_SILENCE_MODULAR_DEPRECATION_WARNINGS = true;
    });

    afterEach(async function afterEachTest() {
      // @ts-ignore
      globalThis.RNFB_SILENCE_MODULAR_DEPRECATION_WARNINGS = false;
    });

    it('returns a Firestore instance', function () {
      const instance = firebase.firestore().doc(`${COLLECTION}/bar`);
      should.equal(instance.firestore.constructor.name, 'FirebaseFirestoreModule');
    });

    it('returns the document id', function () {
      const instance = firebase.firestore().doc(`${COLLECTION}/bar`);
      instance.id.should.equal('bar');
    });

    it('returns the parent collection reference', function () {
      const instance = firebase.firestore().doc(`${COLLECTION}/bar`);
      instance.parent.id.should.equal(COLLECTION);
    });

    it('returns the path', function () {
      const instance1 = firebase.firestore().doc(`${COLLECTION}/bar`);
      const instance2 = firebase.firestore().collection(COLLECTION).doc('bar');
      instance1.path.should.equal(`${COLLECTION}/bar`);
      instance2.path.should.equal(`${COLLECTION}/bar`);
    });
  });

  describe('modular', function () {
    it('returns a Firestore instance', function () {
      const { getFirestore, doc } = firestoreModular;
      const instance = doc(getFirestore(), `${COLLECTION}/bar`);
      should.equal(instance.firestore.constructor.name, 'FirebaseFirestoreModule');
    });

    it('returns the document id', function () {
      const { getFirestore, doc } = firestoreModular;
      const instance = doc(getFirestore(), `${COLLECTION}/bar`);
      instance.id.should.equal('bar');
    });

    it('returns the parent collection reference', function () {
      const { getFirestore, doc } = firestoreModular;
      const instance = doc(getFirestore(), `${COLLECTION}/bar`);
      instance.parent.id.should.equal(COLLECTION);
    });

    it('returns the path', function () {
      const { getFirestore, doc, collection } = firestoreModular;
      const db = getFirestore();
      const instance1 = doc(db, `${COLLECTION}/bar`);
      const instance2 = doc(collection(db, COLLECTION), 'bar');
      instance1.path.should.equal(`${COLLECTION}/bar`);
      instance2.path.should.equal(`${COLLECTION}/bar`);
    });
  });
});
