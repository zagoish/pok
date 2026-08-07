import ModalShell from './ModalShell'

interface RulesModalProps {
  open: boolean
  onClose: () => void
}

export default function RulesModal({ open, onClose }: RulesModalProps) {
  return (
    <ModalShell
      open={open}
      onClose={onClose}
      labelledBy="rules-heading"
      className="rules-modal"
      fallbackSelector="#rules-button"
    >
        <div className="rules-modal__header">
          <div>
            <span className="section-kicker">FIELD MANUAL / RULES</span>
            <h2 id="rules-heading">对局规则</h2>
          </div>
          <button type="button" className="icon-button" aria-label="关闭规则" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="rules-modal__body">
          <ol className="rules-list">
            <li>
              <strong>拿取三种不同代币</strong>
              <span>从银行各拿一枚不同颜色的代币。</span>
            </li>
            <li>
              <strong>拿取两枚同色代币</strong>
              <span>只有银行中该颜色至少有四枚时才可拿取。</span>
            </li>
            <li>
              <strong>购买一张卡牌</strong>
              <span>支付费用后获得卡牌的奖励和积分，市场会补入新卡。</span>
            </li>
            <li>
              <strong>预留一张卡牌</strong>
              <span>把卡牌放入自己的预留区，并从银行获得一枚万能代币。</span>
            </li>
          </ol>

          <div className="rules-callouts">
            <p><strong>十枚代币上限：</strong>回合结束时不能持有超过十枚代币。</p>
            <p><strong>贵族条件：</strong>卡牌奖励永久保留，用来满足贵族的奖励需求。</p>
            <p><strong>15 分终局：</strong>有人达到 15 分后，当前轮继续完成，所有人都有一次最后行动。</p>
          </div>
        </div>

        <button type="button" className="action-button action-button--primary rules-modal__close" onClick={onClose}>
          返回牌桌
        </button>
    </ModalShell>
  )
}
