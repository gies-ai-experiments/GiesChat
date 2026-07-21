import { Tools } from 'librechat-data-provider';
import type { TMessage } from 'librechat-data-provider';
import { findQuestionCard, QUESTION_CARD_PREFIX } from '../QuestionDock';

const card = { resourceId: 'abc', uri: `${QUESTION_CARD_PREFIX}set1`, text: '<html/>' };
const otherResource = { resourceId: 'xyz', uri: 'ui://other/widget', text: '<html/>' };

const withResources = (resources: object[], messageId = 'm1') =>
  ({
    messageId,
    attachments: [{ type: Tools.ui_resources, [Tools.ui_resources]: resources }],
  }) as unknown as TMessage;

const plain = (messageId: string) => ({ messageId }) as TMessage;

describe('findQuestionCard', () => {
  it('returns the card when it belongs to the latest message', () => {
    const messages = [plain('m0'), withResources([otherResource, card])];
    expect(findQuestionCard(messages)?.resourceId).toBe('abc');
  });

  it('returns nothing once a newer message exists (answered / user moved on)', () => {
    const messages = [withResources([card]), plain('m2')];
    expect(findQuestionCard(messages)).toBeUndefined();
  });

  it('ignores non-question ui resources', () => {
    expect(findQuestionCard([withResources([otherResource])])).toBeUndefined();
  });

  it('handles empty and missing input', () => {
    expect(findQuestionCard([])).toBeUndefined();
    expect(findQuestionCard(undefined)).toBeUndefined();
    expect(findQuestionCard([plain('m1')])).toBeUndefined();
  });
});
